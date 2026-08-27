import { NextResponse, after } from "next/server";

import { readSession } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { NewsletterCampaignModel } from "@/lib/db/models/platform";
import { isEmailConfigured } from "@/lib/email/provider";
import { hasCronSecret } from "@/lib/platform/cron";
import { isAdminRole } from "@/lib/platform/enums";
import { expireOverdueProposals } from "@/lib/platform/expiry";
import { dispatchBatch, dispatchCampaign, finalizeCampaign, launchCampaign } from "@/lib/platform/newsletter";

export const maxDuration = 300;

/** Plafond par exécution : le planificateur repasse, la tâche ne doit pas expirer. */
const MAX_CAMPAIGNS = 5;

/**
 * Tâches planifiées de la plate-forme.
 *
 * Un seul point d'entrée pour trois travaux qui doivent tourner régulièrement,
 * plutôt que trois routes à déclarer, à protéger et à surveiller séparément :
 *
 * 1. **Reprise des envois interrompus.** Une campagne traitée par lots dans une
 *    tâche de fond reste en `sending` si l'hébergeur l'interrompt. On la reprend
 *    là où elle s'est arrêtée.
 * 2. **Départ des campagnes programmées.** `scheduledAt` était jusqu'ici stocké
 *    sans que rien ne l'honore.
 * 3. **Péremption des propositions.** `validUntil` n'était qu'affiché : une
 *    offre restait indéfiniment acceptable.
 *
 * Chaque travail est **idempotent** : les sélections portent sur des statuts que
 * les mises à jour font changer, si bien qu'une seconde exécution ne trouve plus
 * rien. Deux exécutions concurrentes du planificateur ne peuvent donc pas faire
 * partir une campagne deux fois.
 *
 * ## Accès, et pourquoi les deux méthodes ne l'accordent pas pareil
 *
 * `GET` n'accepte **que** le secret porté en en-tête. Les planificateurs
 * d'hébergeurs — Vercel Cron notamment — appellent en `GET` ; c'est donc la
 * méthode qu'il faut ouvrir. Mais une route `GET` qui accepterait aussi une
 * session d'administration serait déclenchable depuis une simple balise
 * `<img src="…/api/cron">` posée sur une page tierce, avec les droits de
 * l'administrateur qui la consulte. Une balise ne peut pas poser d'en-tête :
 * exiger le secret referme exactement cette porte.
 *
 * `POST` accepte les deux voies, dont la session d'administration, pour une
 * relance manuelle depuis le tableau de bord.
 *
 * Fréquence conseillée : toutes les cinq minutes. Voir `vercel.json` et
 * `.github/workflows/cron.yml`.
 */
export async function GET(request: Request) {
  if (!hasCronSecret(request)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  return run();
}

export async function POST(request: Request) {
  if (!hasCronSecret(request)) {
    const session = await readSession();
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }
  }
  return run();
}

async function run() {
  await connectToDatabase();

  const resumed = await resumeSending();
  const started = await startScheduled();
  const expired = await expireOverdueProposals();

  return NextResponse.json({ ok: true, resumed, started, expired });
}

/** Reprend les campagnes laissées en cours par une tâche de fond interrompue. */
async function resumeSending() {
  const campaigns = (await NewsletterCampaignModel.find({ status: "sending" })
    .select("_id")
    .limit(MAX_CAMPAIGNS)
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

  return results;
}

/**
 * Lance les campagnes dont l'heure est venue.
 *
 * Le passage à `sending` est conditionnel sur `status: "scheduled"` : deux
 * exécutions simultanées du planificateur ne peuvent pas en lancer une deux
 * fois — la seconde ne trouve plus la campagne dans l'état attendu.
 */
async function startScheduled() {
  const now = new Date();

  const due = (await NewsletterCampaignModel.find({
    status: "scheduled",
    scheduledAt: { $ne: null, $lte: now },
  })
    .select("_id")
    .limit(MAX_CAMPAIGNS)
    .lean()) as { _id: unknown }[];

  if (due.length === 0) return [];

  if (!isEmailConfigured()) {
    /*
     * Sans fournisseur, l'envoi échouerait destinataire par destinataire et
     * marquerait la campagne en échec. On la laisse programmée : elle partira
     * quand la configuration sera faite, plutôt que d'être perdue.
     */
    console.error("[cron] campagnes programmées non lancées : RESEND_API_KEY absente.");
    return [];
  }

  const started: { campaignId: string; recipientCount: number }[] = [];

  for (const campaign of due) {
    const campaignId = String(campaign._id);
    const launched = await launchCampaign(campaignId, ["scheduled"]);
    if (!launched.ok) continue;

    started.push({ campaignId, recipientCount: launched.recipientCount });

    after(async () => {
      try {
        await dispatchCampaign(campaignId);
      } catch (error) {
        console.error("[cron] envoi interrompu :", error);
      }
    });
  }

  return started;
}
