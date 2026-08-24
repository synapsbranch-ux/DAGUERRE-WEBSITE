import type { MetadataRoute } from "next";

import { defaultLocale, locales, type Locale } from "@/lib/i18n";

/**
 * Table centrale des routes.
 *
 * ## Principe
 *
 * Les dossiers de `app/[locale]/` portent toujours le **slug français** : c'est
 * la forme canonique interne. Le slug anglais n'existe que dans l'URL publique,
 * et `proxy.ts` réécrit `/en/portfolio` vers `/en/realisations` avant le rendu.
 *
 * ## Règle absolue
 *
 * Aucun lien interne ne doit être écrit en dur. Tout passe par `href()`, sinon
 * la version anglaise pointera vers une URL qui n'existe pas publiquement.
 */

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

export type RouteKey =
  | "home"
  | "about"
  | "projects"
  | "datakle"
  | "services"
  | "blog"
  | "blogCategory"
  | "blogTag"
  | "engagement"
  | "cv"
  | "research"
  | "skills"
  | "contact"
  | "links"
  | "legal"
  | "privacy";

export type RouteDefinition = {
  /** Segment(s) par locale, sans barre oblique initiale. `""` pour l'accueil. */
  path: Record<Locale, string>;
  /** Libellé du fil d'Ariane et de la navigation. */
  label: Record<Locale, string>;
  /** Présent dans le sitemap ? Faux pour les préfixes de taxonomie. */
  inSitemap: boolean;
  priority: number;
  changeFrequency: ChangeFrequency;
};

export const routes: Record<RouteKey, RouteDefinition> = {
  home: {
    path: { fr: "", en: "" },
    label: { fr: "Accueil", en: "Home" },
    inSitemap: true,
    priority: 1,
    changeFrequency: "weekly",
  },
  about: {
    path: { fr: "a-propos", en: "about" },
    label: { fr: "À propos", en: "About" },
    inSitemap: true,
    priority: 0.9,
    changeFrequency: "monthly",
  },
  projects: {
    path: { fr: "realisations", en: "portfolio" },
    label: { fr: "Réalisations", en: "Portfolio" },
    inSitemap: true,
    priority: 0.9,
    changeFrequency: "weekly",
  },
  datakle: {
    path: { fr: "datakle", en: "datakle" },
    label: { fr: "Datakle", en: "Datakle" },
    inSitemap: true,
    priority: 0.9,
    changeFrequency: "monthly",
  },
  services: {
    path: { fr: "datakle/services", en: "datakle/services" },
    label: { fr: "Services", en: "Services" },
    inSitemap: true,
    priority: 0.8,
    changeFrequency: "monthly",
  },
  blog: {
    path: { fr: "blog", en: "blog" },
    label: { fr: "Blogue", en: "Blog" },
    inSitemap: true,
    priority: 0.9,
    changeFrequency: "daily",
  },
  blogCategory: {
    path: { fr: "blog/categorie", en: "blog/category" },
    label: { fr: "Catégorie", en: "Category" },
    inSitemap: false,
    priority: 0.5,
    changeFrequency: "weekly",
  },
  blogTag: {
    path: { fr: "blog/tag", en: "blog/tag" },
    label: { fr: "Tag", en: "Tag" },
    inSitemap: false,
    priority: 0.4,
    changeFrequency: "weekly",
  },
  engagement: {
    path: { fr: "engagement", en: "engagement" },
    label: { fr: "Engagement", en: "Engagement" },
    inSitemap: true,
    priority: 0.7,
    changeFrequency: "monthly",
  },
  cv: {
    path: { fr: "cv", en: "resume" },
    label: { fr: "CV", en: "Résumé" },
    inSitemap: true,
    priority: 0.8,
    changeFrequency: "monthly",
  },
  research: {
    path: { fr: "recherche", en: "research" },
    label: { fr: "Recherche", en: "Research" },
    inSitemap: true,
    priority: 0.7,
    changeFrequency: "monthly",
  },
  skills: {
    path: { fr: "competences", en: "skills" },
    label: { fr: "Compétences", en: "Skills" },
    inSitemap: true,
    priority: 0.8,
    changeFrequency: "monthly",
  },
  contact: {
    path: { fr: "contact", en: "contact" },
    label: { fr: "Contact", en: "Contact" },
    inSitemap: true,
    priority: 0.8,
    changeFrequency: "yearly",
  },
  links: {
    path: { fr: "liens", en: "links" },
    label: { fr: "Liens", en: "Links" },
    inSitemap: true,
    priority: 0.5,
    changeFrequency: "monthly",
  },
  legal: {
    path: { fr: "mentions-legales", en: "legal-notice" },
    label: { fr: "Mentions légales", en: "Legal notice" },
    inSitemap: true,
    priority: 0.2,
    changeFrequency: "yearly",
  },
  privacy: {
    path: { fr: "politique-de-confidentialite", en: "privacy-policy" },
    label: { fr: "Politique de confidentialité", en: "Privacy policy" },
    inSitemap: true,
    priority: 0.2,
    changeFrequency: "yearly",
  },
};

export const routeKeys = Object.keys(routes) as RouteKey[];

/**
 * URL **publique** d'une route, avec préfixe de locale.
 * `href("projects", "en")` → `/en/portfolio`
 * `href("blog", "fr", "mon-article")` → `/fr/blog/mon-article`
 */
export function href(key: RouteKey, locale: Locale, ...segments: string[]): string {
  const base = routes[key].path[locale];
  const parts = [locale, base, ...segments].filter(Boolean);
  return `/${parts.join("/")}`;
}

/** Chemin **interne** (dossiers de `app/`), toujours en français. */
export function internalHref(key: RouteKey, locale: Locale, ...segments: string[]): string {
  const base = routes[key].path[defaultLocale];
  const parts = [locale, base, ...segments].filter(Boolean);
  return `/${parts.join("/")}`;
}

/**
 * URLs de la même page dans toutes les locales — alimente `hreflang`.
 * `segmentsByLocale` permet aux contenus dont le slug est traduit
 * (articles, projets) de fournir leur propre correspondance.
 */
export function alternatesFor(
  key: RouteKey,
  segmentsByLocale?: Partial<Record<Locale, string[]>>,
): Record<Locale, string> {
  return Object.fromEntries(
    locales.map((locale) => [locale, href(key, locale, ...(segmentsByLocale?.[locale] ?? []))]),
  ) as Record<Locale, string>;
}

/**
 * Traduit un chemin public anglais vers son équivalent interne français.
 * Utilisé par `proxy.ts`. Retourne `null` si aucune réécriture n'est requise.
 *
 * Le tri par nombre de segments décroissant garantit que `blog/category`
 * l'emporte sur `blog`.
 */
const rewriteTable = routeKeys
  .map((key) => ({
    from: routes[key].path.en,
    to: routes[key].path[defaultLocale],
  }))
  .filter((entry) => entry.from !== "" && entry.from !== entry.to)
  .sort((a, b) => b.from.split("/").length - a.from.split("/").length);

/**
 * Détecte un chemin **interne** (slug français) atteint depuis une autre
 * locale — par exemple `/en/realisations`. Retourne le chemin public correct
 * (`portfolio`) afin que le proxy y redirige.
 *
 * Sans cette redirection, la même page serait servie à deux URL en anglais :
 * Google y verrait du contenu dupliqué.
 */
export function toPublicPath(locale: Locale, publicPath: string): string | null {
  if (locale === defaultLocale) return null;

  const trimmed = publicPath.replace(/^\/+|\/+$/g, "");
  if (!trimmed) return null;

  for (const { from, to } of rewriteTable) {
    // `to` est le slug français, `from` le slug anglais.
    if (trimmed === to) return from;
    if (trimmed.startsWith(`${to}/`)) return `${from}${trimmed.slice(to.length)}`;
  }

  return null;
}

export function toInternalPath(locale: Locale, publicPath: string): string | null {
  // Le français est déjà la forme interne.
  if (locale === defaultLocale) return null;

  const trimmed = publicPath.replace(/^\/+|\/+$/g, "");
  if (!trimmed) return null;

  for (const { from, to } of rewriteTable) {
    if (trimmed === from) return to;
    if (trimmed.startsWith(`${from}/`)) return `${to}${trimmed.slice(from.length)}`;
  }

  return null;
}

/** Transforme un slug en libellé lisible : `suivi-evaluation` → `Suivi evaluation`. */
export function humanizeSlug(slug: string): string {
  const words = decodeURIComponent(slug).replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Clé de route correspondant à un chemin public, ou `null`. */
export function routeKeyForPath(locale: Locale, publicPath: string): RouteKey | null {
  const trimmed = publicPath.replace(/^\/+|\/+$/g, "");
  if (!trimmed) return "home";

  const matches = routeKeys
    .filter((key) => {
      const p = routes[key].path[locale];
      return p !== "" && (trimmed === p || trimmed.startsWith(`${p}/`));
    })
    .sort((a, b) => routes[b].path[locale].length - routes[a].path[locale].length);

  return matches[0] ?? null;
}

/** Libellé d'un segment de chemin, pour le fil d'Ariane. */
export function labelForPath(locale: Locale, publicPath: string): string {
  const trimmed = publicPath.replace(/^\/+|\/+$/g, "");
  const withoutLocale = trimmed.startsWith(`${locale}/`)
    ? trimmed.slice(locale.length + 1)
    : trimmed === locale
      ? ""
      : trimmed;

  const key = routeKeys.find((k) => routes[k].path[locale] === withoutLocale);
  if (key) return routes[key].label[locale];

  return humanizeSlug(withoutLocale.split("/").at(-1) ?? "");
}

/** Le chemin public correspond-il exactement à une route déclarée ? */
export function isKnownPath(locale: Locale, publicPath: string): boolean {
  const trimmed = publicPath.replace(/^\/+|\/+$/g, "");
  const withoutLocale = trimmed.startsWith(`${locale}/`)
    ? trimmed.slice(locale.length + 1)
    : trimmed === locale
      ? ""
      : trimmed;

  return routeKeys.some(
    (key) => routes[key].inSitemap && routes[key].path[locale] === withoutLocale,
  );
}
