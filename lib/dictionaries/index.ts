import { locale as rootLocale } from "next/root-params";

import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";

import type { Dictionary } from "@/lib/dictionaries/fr";

/**
 * Chargeur de dictionnaire — pattern recommandé par la doc Next
 * (`01-app/02-guides/internationalization.md`), adapté à `next/root-params`.
 *
 * Les dictionnaires sont importés dynamiquement : ils restent côté serveur et
 * ne pèsent pas sur le bundle client. Un fichier qui importe
 * `next/root-params` échoue à la compilation s'il est utilisé dans un
 * composant client, ce qui rend `import "server-only"` superflu.
 */
const dictionaries = {
  fr: () => import("@/lib/dictionaries/fr").then((m) => m.fr),
  en: () => import("@/lib/dictionaries/en").then((m) => m.en),
} satisfies Record<Locale, () => Promise<Dictionary>>;

/** Dictionnaire d'une locale explicite. */
export function getDictionaryFor(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

/**
 * Dictionnaire de la locale courante, lue depuis les paramètres racine.
 * Utilisable dans n'importe quel Server Component — mais pas dans un Route
 * Handler, où `next/root-params` n'est pas encore pris en charge.
 */
export async function getDictionary(): Promise<Dictionary> {
  return getDictionaryFor(await getLocale());
}

/** Locale courante, normalisée. */
export async function getLocale(): Promise<Locale> {
  const current = await rootLocale();
  return isLocale(current ?? "") ? (current as Locale) : defaultLocale;
}

export type { Dictionary };
