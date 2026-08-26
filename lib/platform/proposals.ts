import { computeTotals, parseAmountToMinor } from "@/lib/platform/money";
import { proposalInputSchema } from "@/lib/validation-platform";

/**
 * Conversion et contrôle d'une proposition reçue du formulaire.
 *
 * Les montants arrivent en texte et repartent en **unités mineures entières**.
 * Les totaux sont recalculés ici : le navigateur en affiche un pour rassurer
 * la saisie, mais seul celui-ci est écrit — sans quoi une requête forgée
 * pourrait annoncer un total nul sur des lignes facturées.
 */
export function buildProposal(input: unknown):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: unknown; status: number } {
  const parsed = proposalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.flatten(), status: 400 };

  const data = parsed.data;
  const items: { name: string; description: string; quantity: number; unitPrice: number; position: number }[] = [];

  for (const [index, item] of data.items.entries()) {
    const unitPrice = parseAmountToMinor(item.unitPrice);
    if (unitPrice === null) {
      return { ok: false, error: `Prix unitaire invalide à la ligne ${index + 1}.`, status: 400 };
    }
    items.push({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice,
      position: index,
    });
  }

  const discount = parseAmountToMinor(data.discount);
  const tax = parseAmountToMinor(data.tax);
  if (discount === null || tax === null) {
    return { ok: false, error: "Remise ou taxes invalides.", status: 400 };
  }

  const totals = computeTotals(items, discount, tax);
  if (discount > totals.subtotal) {
    return { ok: false, error: "La remise dépasse le sous-total.", status: 400 };
  }

  return {
    ok: true,
    value: {
      title: data.title,
      summary: data.summary,
      currency: data.currency,
      items: items.map((item, index) => ({ ...item, amount: totals.amounts[index] })),
      subtotal: totals.subtotal,
      discount,
      tax,
      total: totals.total,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      terms: data.terms,
    },
  };
}
