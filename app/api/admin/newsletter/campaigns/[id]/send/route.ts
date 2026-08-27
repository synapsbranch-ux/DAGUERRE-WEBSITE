import { NextResponse, after } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { isEmailConfigured } from "@/lib/email/provider";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { dispatchCampaign, launchCampaign } from "@/lib/platform/newsletter";
import { campaignSendSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 300;

/**
 * Lancement d'une campagne.
 *
 * ## Idempotence
 *
 * Le passage à `sending` se fait par une mise à jour **conditionnelle** sur le
 * statut courant. Un double-clic, un rafraîchissement ou une reprise réseau
 * trouvent la campagne déjà en cours et n'ouvrent pas un second envoi.
 * La liste des destinataires est ensuite figée sous un index unique
 * `(campaignId, subscriberId)` : même relancée, elle n'ajoute personne deux
 * fois.
 *
 * ## Exécution
 *
 * La réponse ne dépend pas de la fin de l'envoi : `after()` poursuit le
 * traitement par lots une fois la réponse rendue. Boucler sur des milliers de
 * destinataires dans la requête d'administration la ferait expirer et
 * laisserait la campagne à moitié partie sans que personne ne le sache.
 *
 * Si l'hébergeur interrompt la tâche de fond, la campagne reste en `sending`
 * avec sa file : `POST /api/newsletter/dispatch` la reprend là où elle en est.
 */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = campaignSendSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Confirmation requise." }, { status: 400 });

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Envoi de courriel non configuré : renseignez RESEND_API_KEY avant de lancer une campagne." },
      { status: 503 },
    );
  }

  await connectToDatabase();

  // Réservation atomique et constitution de la liste — partagées avec le
  // planificateur, pour que les deux voies de départ ne puissent pas diverger.
  const launched = await launchCampaign(id, ["draft", "ready", "scheduled", "failed"]);

  if (!launched.ok) {
    if (launched.reason === "not_found") {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }
    if (launched.reason === "already_running") {
      return NextResponse.json(
        { error: `Cette campagne est déjà « ${launched.status} ». Aucun second envoi n'a été déclenché.` },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "La liste des destinataires n'a pas pu être constituée." },
      { status: 500 },
    );
  }

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "newsletter_sent",
    entityType: "NewsletterCampaign",
    entityId: id,
    metadata: { audience: launched.audience, recipientCount: launched.recipientCount },
  });

  after(async () => {
    try {
      await dispatchCampaign(id);
    } catch (error) {
      console.error("[newsletter] envoi interrompu :", error);
    }
  });

  return NextResponse.json({ ok: true, recipientCount: launched.recipientCount });
}
