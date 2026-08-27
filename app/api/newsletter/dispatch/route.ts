import { NextResponse } from "next/server";

import { readSession } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { NewsletterCampaignModel } from "@/lib/db/models/platform";
import { hasCronSecret } from "@/lib/platform/cron";
import { isAdminRole } from "@/lib/platform/enums";
import { dispatchBatch, finalizeCampaign } from "@/lib/platform/newsletter";

export const maxDuration = 300;

/**
 * Reprise des envois en cours — voie historique.
 *
 * `POST /api/cron` fait ce travail et deux autres ; ce point d'entrée reste
 * pour les planificateurs déjà configurés dessus et pour relancer un envoi
 * bloqué sans déclencher les autres tâches.
 */
export async function POST(request: Request) {
  if (!hasCronSecret(request)) {
    const session = await readSession();
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
  }

  await connectToDatabase();

  const campaigns = (await NewsletterCampaignModel.find({ status: "sending" })
    .select("_id")
    .limit(5)
    .lean()) as { _id: unknown }[];

  const results: { campaignId: string; sent: number; failed: number; remaining: number }[] = [];

  for (const campaign of campaigns) {
    const campaignId = String(campaign._id);
    const batch = await dispatchBatch(campaignId);
    if (batch.remaining === 0) await finalizeCampaign(campaignId);
    results.push({
      campaignId,
      sent: batch.sent,
      failed: batch.failed,
      remaining: batch.remaining,
    });
  }

  return NextResponse.json({ ok: true, campaigns: results });
}
