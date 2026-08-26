import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { connectToDatabase } from "@/lib/db/client";
import { NewsletterCampaignModel } from "@/lib/db/models/platform";
import { readSession } from "@/lib/admin";
import { isAdminRole } from "@/lib/platform/enums";
import { dispatchBatch, finalizeCampaign } from "@/lib/platform/newsletter";

export const maxDuration = 300;

/**
 * Reprise des envois en cours.
 *
 * Ce site n'a pas de file d'attente dédiée : une campagne est traitée par lots
 * dans une tâche de fond lancée par la requête d'administration. Si
 * l'hébergeur interrompt cette tâche — redéploiement, limite de durée — la
 * campagne reste en `sending` avec ses destinataires encore en file.
 *
 * Ce point d'entrée reprend le travail. Il est prévu pour un planificateur
 * (cron d'hébergeur, tâche externe) appelé toutes les quelques minutes, et
 * reste sans effet quand il n'y a rien à envoyer.
 *
 * ## Accès
 *
 * Deux voies : l'en-tête `authorization: Bearer <CRON_SECRET>` pour un
 * planificateur, ou une session d'administration pour une relance manuelle.
 * Sans `CRON_SECRET` configuré, la voie automatique est fermée — un point
 * d'entrée d'envoi de masse ouvert à tous serait une arme.
 */
function hasCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (provided.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

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
