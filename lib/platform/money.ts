import type { Locale } from "@/lib/i18n";
import { currencies, type Currency } from "@/lib/platform/enums";

/**
 * Sommes d'argent.
 *
 * Les montants circulent et se stockent en **unités mineures entières**
 * (centimes). 19,99 $ vaut `1999`. Multiplier une quantité par un prix
 * unitaire en nombre à virgule flottante produit `0.1 * 3 = 0.30000000000000004`
 * puis, arrondi après arrondi, un total qui ne correspond plus à la somme des
 * lignes. En entiers, l'arithmétique est exacte.
 */

/** Décimales de chaque devise — toutes celles retenues en ont deux. */
const FRACTION_DIGITS = 2;
const UNIT = 10 ** FRACTION_DIGITS;

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (currencies as readonly string[]).includes(value);
}

/**
 * Convertit une saisie en unités mineures.
 *
 * La virgule décimale française et les espaces de groupement sont acceptés.
 * Renvoie `null` si la saisie n'est pas un nombre positif exploitable :
 * l'appelant refuse alors l'enregistrement au lieu d'écrire `NaN` en base.
 */
export function parseAmountToMinor(input: unknown): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return null;
    return Math.round(input * UNIT);
  }
  if (typeof input !== "string") return null;

  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * UNIT);
}

/** Unités mineures vers une chaîne éditable dans un formulaire. */
export function minorToInput(minor: number): string {
  return (Math.round(minor) / UNIT).toFixed(FRACTION_DIGITS);
}

/** Montant formaté pour l'affichage, dans la devise et la langue voulues. */
export function formatMoney(minor: number, currency: string, locale: Locale): string {
  const code = isCurrency(currency) ? currency : "CAD";
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: code,
  }).format(Math.round(minor) / UNIT);
}

/**
 * Totaux d'une proposition, recalculés **côté serveur**.
 *
 * Le navigateur affiche un total pour confirmer la saisie, mais c'est cette
 * fonction qui fait foi : sans elle, une requête forgée pourrait annoncer
 * `total: 0` sur des lignes facturées.
 */
export function computeTotals(
  items: { quantity: number; unitPrice: number }[],
  discount = 0,
  tax = 0,
): { amounts: number[]; subtotal: number; total: number } {
  const amounts = items.map((item) => Math.round(item.quantity * item.unitPrice));
  const subtotal = amounts.reduce((sum, amount) => sum + amount, 0);
  const total = Math.max(0, subtotal - Math.max(0, discount)) + Math.max(0, tax);
  return { amounts, subtotal, total };
}
