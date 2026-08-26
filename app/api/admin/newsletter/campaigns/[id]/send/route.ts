import { NextResponse, after } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { NewsletterCampaignModel } from "@/lib/db/models/platform";
import { isEmailConfigured } from "@/lib/email/provider";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { isMember, type CampaignAudience, campaignAudiences } from "@/lib/platform/enums";
import { dispatchCampaign, snapshotRecipients } from "@/lib/platform/newsletter";
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

  // Réservation atomique : seul le premier appel fait basculer le statut.
  const campaign = (await NewsletterCampaignModel.findOneAndUpdate(
    { _id: id, status: { $in: ["draft", "ready", "failed"] } },
    { $set: { status: "sending", lastError: "" } },
    { new: true },
  ).lean()) as Record<string, unknown> | null;

  if (!campaign) {
    const current = (await NewsletterCampaignModel.findById(id)
      .select("status")
      .lean()) as { status?: string } | null;
    if (!current) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json(
      { error: `Cette campagne est déjà « ${current.status} ». Aucun second envoi n'a été déclenché.` },
      { status: 409 },
    );
  }

  const audienceValue = String(campaign.audienceType ?? "all_active");
  const audience: CampaignAudience = isMember(campaignAudiences, audienceValue)
    ? audienceValue
    : "all_active";

  let recipientCount = 0;
  try {
    recipientCount = await snapshotRecipients(id, audience);
  } catch (error) {
    await NewsletterCampaignModel.updateOne(
      { _id: id },
      { $set: { status: "failed", lastError: "Constitution de la liste impossible." } },
    );
    console.error("[newsletter] snapshot impossible :", error);
    return NextResponse.json({ error: "La liste des destinataires n'a pas pu être constituée." }, { status: 500 });
  }

  await NewsletterCampaignModel.updateOne({ _id: id }, { $set: { recipientCount } });

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "newsletter_sent",
    entityType: "NewsletterCampaign",
    entityId: id,
    metadata: { audience, recipientCount },
  });

  after(async () => {
    try {
      await dispatchCampaign(id);
    } catch (error) {
      console.error("[newsletter] envoi interrompu :", error);
    }
  });

  return NextResponse.json({ ok: true, recipientCount });
}
