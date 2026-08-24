/**
 * Socle i18n — constantes partagées.
 *
 * Ce module ne dépend d'aucune API Next : il est importé aussi bien par
 * `proxy.ts` (qui s'exécute avant le rendu) que par les composants serveur.
 */

export const locales = ["fr", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

/** Codes utilisés par Open Graph. */
export const ogLocales: Record<Locale, string> = {
  fr: "fr_CA",
  en: "en_CA",
};

/** Libellé affiché dans le sélecteur de langue. */
export const localeLabels: Record<Locale, string> = {
  fr: "FR",
  en: "EN",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/**
 * Négocie la locale à partir de l'en-tête `Accept-Language`.
 * Retombe sur le français si aucune langue reconnue n'est demandée.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="))
        ?.slice(2);
      return { tag: tag.trim().toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .filter((entry) => Number.isFinite(entry.q))
    .sort((a, b) => b.q - a.q);

  return ranked.find((entry) => isLocale(entry.tag))?.tag as Locale | undefined ?? defaultLocale;
}
