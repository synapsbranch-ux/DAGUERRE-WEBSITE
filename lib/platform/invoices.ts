import { computeTotals } from "@/lib/platform/money";
import type { InvoiceStatus } from "@/lib/platform/enums";

/**
 * Arithmétique d'une facture.
 *
 * Tout est en **unités mineures entières** et les taux en **parties par
 * million** : 5 % vaut 50 000, et 9,975 % vaut 99 750.
 *
 * Pourquoi pas les points de base, l'unité habituelle ? Parce que la TVQ
 * québécoise est à 9,975 % : en points de base elle vaudrait 997,5, un nombre à
 * virgule — exactement ce que cette représentation cherche à éviter. Au
 * millionième, tous les taux réels tombent juste.
 *
 * Ces fonctions font foi côté serveur. Le navigateur affiche un total pour
 * confirmer la saisie, mais une requête forgée qui annoncerait `total: 0` sur
 * des lignes facturées serait ignorée : c'est ce calcul qui est enregistré.
 */

export type InvoiceItemInput = { quantity: number; unitPrice: number };

export type TaxInput = {
  label: string;
  /** Taux en parties par million : 9,975 % vaut 99 750. */
  ratePpm: number;
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

/** Une partie par million vaut un dix-millième de pour cent. */
const PPM = 1_000_000;

/**
 * Applique un taux à une base.
 *
 * `Math.round` sur le résultat entier, une seule fois : arrondir ligne par
 * ligne puis sommer produirait un total qui ne correspond pas au taux affiché.
 */
export function applyRate(base: number, ratePpm: number): number {
  if (base <= 0 || ratePpm <= 0) return 0;
  return Math.round((base * ratePpm) / PPM);
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
    amount: applyRate(taxableBase, tax.ratePpm),
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
