import { computeTotals } from "@/lib/platform/money";
import type { InvoiceStatus } from "@/lib/platform/enums";

/**
 * Arithmétique d'une facture.
 *
 * Tout est en **unités mineures entières** et les taux en **points de base**
 * (5 % vaut 500). Un taux en nombre à virgule flottante — 0.05 — introduit une
 * erreur dès la première multiplication ; en entiers, `montant * 500 / 10000`
 * arrondi une seule fois donne toujours le même résultat.
 *
 * Ces fonctions font foi côté serveur. Le navigateur affiche un total pour
 * confirmer la saisie, mais une requête forgée qui annoncerait `total: 0` sur
 * des lignes facturées serait ignorée : c'est ce calcul qui est enregistré.
 */

export type InvoiceItemInput = { quantity: number; unitPrice: number };

export type TaxInput = {
  label: string;
  rateBasisPoints: number;
  registration?: string;
};

export type ComputedTax = TaxInput & { amount: number };

export type InvoiceTotals = {
  amounts: number[];
  subtotal: number;
  discount: number;
  /** Base d'imposition : sous-total moins remise, jamais négative. */
  taxableBase: number;
  taxes: ComputedTax[];
  taxTotal: number;
  total: number;
};

/** Un point de base vaut un centième de pour cent. */
const BASIS_POINTS = 10_000;

/**
 * Applique un taux à une base.
 *
 * `Math.round` sur le résultat entier, une seule fois : arrondir ligne par
 * ligne puis sommer produirait un total qui ne correspond pas au taux affiché.
 */
export function applyRate(base: number, rateBasisPoints: number): number {
  if (base <= 0 || rateBasisPoints <= 0) return 0;
  return Math.round((base * rateBasisPoints) / BASIS_POINTS);
}

/**
 * Totaux d'une facture.
 *
 * Les taxes s'appliquent **en parallèle** sur la base imposable, jamais en
 * cascade. Au Québec, TPS et TVQ se calculent toutes deux sur le montant avant
 * taxes depuis 2013 : les composer donnerait un total trop élevé de quelques
 * dollars par millier, soit exactement le genre d'écart qu'un client relève.
 */
export function computeInvoice(
  items: InvoiceItemInput[],
  discount: number,
  taxes: TaxInput[],
): InvoiceTotals {
  const { amounts, subtotal } = computeTotals(items);

  const safeDiscount = Math.min(Math.max(0, Math.round(discount)), subtotal);
  const taxableBase = subtotal - safeDiscount;

  const computed: ComputedTax[] = taxes.map((tax) => ({
    ...tax,
    amount: applyRate(taxableBase, tax.rateBasisPoints),
  }));

  const taxTotal = computed.reduce((sum, tax) => sum + tax.amount, 0);

  return {
    amounts,
    subtotal,
    discount: safeDiscount,
    taxableBase,
    taxes: computed,
    taxTotal,
    total: taxableBase + taxTotal,
  };
}

/**
 * Statut déduit des paiements et de l'échéance.
 *
 * Le statut n'est pas saisi : il se calcule. Laisser un administrateur écrire
 * « payée » sur une facture dont aucun paiement n'est enregistré ferait diverger
 * l'affichage de la comptabilité.
 *
 * `cancelled` est terminal et n'est jamais recalculé — une facture annulée le
 * reste, même si un paiement arrive après coup.
 */
export function deriveInvoiceStatus(
  current: InvoiceStatus,
  total: number,
  amountPaid: number,
  dueAt: Date | null,
  now = new Date(),
): InvoiceStatus {
  if (current === "cancelled" || current === "draft") return current;

  if (amountPaid >= total && total > 0) return "paid";
  if (amountPaid > 0) return "partially_paid";

  // Une facture n'est en retard qu'après son échéance, et seulement si rien
  // n'a été encaissé.
  if (dueAt && dueAt.getTime() < now.getTime()) return "overdue";

  return "sent";
}

/** Reste à payer, jamais négatif — un trop-perçu n'est pas une créance. */
export function amountDue(total: number, amountPaid: number): number {
  return Math.max(0, total - amountPaid);
}
