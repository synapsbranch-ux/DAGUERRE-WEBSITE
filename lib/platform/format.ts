import type { Locale } from "@/lib/i18n";

/**
 * Dates affichées.
 *
 * La base ne stocke que des instants (`Date`), jamais une chaîne déjà
 * formatée : le même enregistrement doit pouvoir s'afficher en français
 * canadien et en anglais canadien, et se trier correctement.
 */

const INTL_LOCALE: Record<Locale, string> = { fr: "fr-CA", en: "en-CA" };

export function formatDate(value: unknown, locale: Locale): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: unknown, locale: Locale): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toDate(value: unknown): Date | null {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

/** Taille de fichier lisible : `1,2 Mo`. */
export function formatBytes(bytes: number, locale: Locale): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = locale === "fr" ? ["o", "ko", "Mo", "Go"] : ["B", "kB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const formatted = new Intl.NumberFormat(INTL_LOCALE[locale], {
    maximumFractionDigits: value < 10 && unit > 0 ? 1 : 0,
  }).format(value);
  return `${formatted} ${units[unit]}`;
}
