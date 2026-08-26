import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { NewsletterCampaignModel } from "@/lib/db/models/platform";
import { sendTransactionalEmail } from "@/lib/email/service";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { campaignContentOf, renderCampaign, unsubscribeUrl } from "@/lib/platform/newsletter";
import { campaignTestSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Envoi d'un exemplaire de test.
 *
 * Le test emprunte le canal **transactionnel** et ne crée aucun destinataire :
 * il ne touche donc ni au statut de la campagne, ni aux statistiques, et ne
 * peut pas être confondu avec un envoi réel. Le lien de désabonnement est
 * fabriqué sur un identifiant fictif pour que la mise en page soit fidèle,
 * sans risquer de désabonner qui que ce soit.
 */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = campaignTestSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Adresse invalide." }, { status: 400 });

  await connectToDatabase();
  const campaign = (await NewsletterCampaignModel.findById(id).lean()) as Record<string, unknown> | null;
  if (!campaign) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const content = campaignContentOf(campaign);
  const email = renderCampaign(content, unsubscribeUrl("000000000000000000000000", content.locale));
  const outcome = await sendTransactionalEmail(parsed.data.email, {
    ...email,
    subject: `[Test] ${email.subject}`,
  });

  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: 502 });

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "newsletter_test_sent",
    entityType: "NewsletterCampaign",
    entityId: id,
    metadata: { to: parsed.data.email },
  });

  return NextResponse.json({ ok: true, transport: outcome.transport });
}
