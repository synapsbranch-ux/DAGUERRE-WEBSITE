import { QuoteProposalModel, QuoteRequestModel } from "@/lib/db/models/platform";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { getClientProfile } from "@/lib/platform/client";
import { notify } from "@/lib/platform/notifications";
import { logQuoteActivity } from "@/lib/platform/quotes";
import { href } from "@/lib/routes";

/**
 * Péremption des propositions transmises.
 *
 * Une proposition porte une date de validité qui, jusqu'ici, n'était
 * qu'affichée. Une offre qui reste éternellement acceptable est un engagement
 * commercial involontaire : un client pouvait accepter six mois plus tard un
 * prix calculé pour une autre saison.
 *
 * Seules les propositions **transmises** expirent. Un brouillon n'engage
 * personne, et une proposition acceptée ou refusée a déjà trouvé sa fin.
 *
 * ## Idempotence
 *
 * La sélection ne retient que `status: "sent"` et la mise à jour porte la même
 * condition : une seconde exécution ne trouve plus rien. Le planificateur peut
 * donc appeler ce traitement aussi souvent qu'il veut.
 */

/** Plafond par exécution : un rattrapage massif ne doit pas saturer la tâche. */
const BATCH = 100;

export type ExpiryResult = { proposals: number; quotes: number };

export async function expireOverdueProposals(now = new Date()): Promise<ExpiryResult> {
  const due = (await QuoteProposalModel.find({
    status: "sent",
    validUntil: { $ne: null, $lt: now },
  })
    .select("_id quoteRequestId title")
    .limit(BATCH)
    .lean()) as { _id: unknown; quoteRequestId?: unknown; title?: unknown }[];

  if (due.length === 0) return { proposals: 0, quotes: 0 };

  let proposals = 0;
  const quoteIds = new Set<string>();

  for (const proposal of due) {
    /*
     * Mise à jour conditionnelle : si le client vient d'accepter entre la
     * sélection et l'écriture, son acceptation gagne. Expirer une proposition
     * déjà acceptée annulerait une vente.
     */
    const applied = await QuoteProposalModel.updateOne(
      { _id: proposal._id, status: "sent" },
      { $set: { status: "expired" } },
    );

    if (applied.modifiedCount === 0) continue;
    proposals += 1;

    const quoteId = String(proposal.quoteRequestId ?? "");
    if (quoteId) quoteIds.add(quoteId);
  }

  let quotes = 0;

  for (const quoteId of quoteIds) {
    // Le dossier ne suit la proposition que s'il attendait encore une réponse.
    const quote = (await QuoteRequestModel.findOneAndUpdate(
      { _id: quoteId, status: { $in: ["quote_sent", "client_review"] } },
      { $set: { status: "expired" } },
      { new: true },
    ).lean()) as { userId?: unknown; title?: unknown } | null;

    if (!quote) continue;
    quotes += 1;

    await logQuoteActivity(quoteId, "status_changed", { id: "", email: "", role: "system" }, {
      status: "expired",
      reason: "validity_elapsed",
    });

    const userId = String(quote.userId ?? "");
    if (!userId) continue;

    const profile = await getClientProfile(userId);
    const preferred = profile?.preferredLanguage ?? "";
    const locale: Locale = isLocale(preferred) ? preferred : defaultLocale;

    await notify({
      userId,
      type: "quote_updated",
      title: String(quote.title ?? ""),
      message:
        locale === "fr"
          ? "La proposition rattachée à ce dossier a dépassé sa date de validité."
          : "The proposal attached to this request has passed its validity date.",
      href: href("portalQuotes", locale, quoteId),
    });
  }

  return { proposals, quotes };
}
