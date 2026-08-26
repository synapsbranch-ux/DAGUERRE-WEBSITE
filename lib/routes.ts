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
  | "privacy"
  // Plate-forme client — comptes, devis, ressources, infolettre.
  | "login"
  | "register"
  | "forgotPassword"
  | "resetPassword"
  | "quote"
  | "quoteClaim"
  | "resources"
  | "newsletter"
  | "newsletterConfirm"
  | "newsletterUnsubscribe"
  | "portal"
  | "portalArticles"
  | "portalResources"
  | "portalQuotes"
  | "portalMessages"
  | "portalProjects"
  | "portalNotifications"
  | "portalProfile";

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

  /*
   * Plate-forme client.
   *
   * Les pages de compte et l'espace client sont hors sitemap : elles n'ont
   * rien à indexer, et leur contenu dépend entièrement de la session. Le
   * formulaire de devis et la bibliothèque publique, eux, sont des pages
   * d'entrée à part entière.
   */
  login: {
    path: { fr: "connexion", en: "login" },
    label: { fr: "Connexion", en: "Sign in" },
    inSitemap: false,
    priority: 0.3,
    changeFrequency: "yearly",
  },
  register: {
    path: { fr: "inscription", en: "register" },
    label: { fr: "Créer un compte", en: "Create an account" },
    inSitemap: false,
    priority: 0.3,
    changeFrequency: "yearly",
  },
  forgotPassword: {
    path: { fr: "mot-de-passe-oublie", en: "forgot-password" },
    label: { fr: "Mot de passe oublié", en: "Forgotten password" },
    inSitemap: false,
    priority: 0.1,
    changeFrequency: "yearly",
  },
  resetPassword: {
    path: { fr: "nouveau-mot-de-passe", en: "reset-password" },
    label: { fr: "Nouveau mot de passe", en: "New password" },
    inSitemap: false,
    priority: 0.1,
    changeFrequency: "yearly",
  },
  quote: {
    path: { fr: "devis", en: "quote" },
    label: { fr: "Demander un devis", en: "Request a quote" },
    inSitemap: true,
    priority: 0.9,
    changeFrequency: "monthly",
  },
  quoteClaim: {
    path: { fr: "devis/reclamer", en: "quote/claim" },
    label: { fr: "Suivre ma demande", en: "Track my request" },
    inSitemap: false,
    priority: 0.1,
    changeFrequency: "yearly",
  },
  resources: {
    path: { fr: "ressources", en: "resources" },
    label: { fr: "Ressources", en: "Resources" },
    inSitemap: true,
    priority: 0.8,
    changeFrequency: "weekly",
  },
  newsletter: {
    path: { fr: "infolettre", en: "newsletter" },
    label: { fr: "Infolettre", en: "Newsletter" },
    inSitemap: false,
    priority: 0.2,
    changeFrequency: "yearly",
  },
  newsletterConfirm: {
    path: { fr: "infolettre/confirmation", en: "newsletter/confirm" },
    label: { fr: "Confirmation", en: "Confirmation" },
    inSitemap: false,
    priority: 0.1,
    changeFrequency: "yearly",
  },
  newsletterUnsubscribe: {
    path: { fr: "infolettre/desabonnement", en: "newsletter/unsubscribe" },
    label: { fr: "Désabonnement", en: "Unsubscribe" },
    inSitemap: false,
    priority: 0.1,
    changeFrequency: "yearly",
  },
  portal: {
    path: { fr: "espace-client", en: "client" },
    label: { fr: "Espace client", en: "Client portal" },
    inSitemap: false,
    priority: 0.3,
    changeFrequency: "daily",
  },
  portalArticles: {
    path: { fr: "espace-client/articles", en: "client/articles" },
    label: { fr: "Articles", en: "Articles" },
    inSitemap: false,
    priority: 0.3,
    changeFrequency: "daily",
  },
  portalResources: {
    path: { fr: "espace-client/ressources", en: "client/resources" },
    label: { fr: "Ressources", en: "Resources" },
    inSitemap: false,
    priority: 0.3,
    changeFrequency: "daily",
  },
  portalQuotes: {
    path: { fr: "espace-client/devis", en: "client/quotes" },
    label: { fr: "Devis", en: "Quotes" },
    inSitemap: false,
    priority: 0.3,
    changeFrequency: "daily",
  },
  portalMessages: {
    path: { fr: "espace-client/messages", en: "client/messages" },
    label: { fr: "Messages", en: "Messages" },
    inSitemap: false,
    priority: 0.3,
    changeFrequency: "daily",
  },
  portalProjects: {
    path: { fr: "espace-client/projets", en: "client/projects" },
    label: { fr: "Projets", en: "Projects" },
    inSitemap: false,
    priority: 0.3,
    changeFrequency: "daily",
  },
  portalNotifications: {
    path: { fr: "espace-client/notifications", en: "client/notifications" },
    label: { fr: "Notifications", en: "Notifications" },
    inSitemap: false,
    priority: 0.3,
    changeFrequency: "daily",
  },
  portalProfile: {
    path: { fr: "espace-client/profil", en: "client/profile" },
    label: { fr: "Profil", en: "Profile" },
    inSitemap: false,
    priority: 0.3,
    changeFrequency: "monthly",
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

/**
 * Forme **publique** d'un chemin, quelle que soit sa provenance.
 *
 * `proxy.ts` réécrit `/en/portfolio` vers `/en/realisations` : pendant le
 * rendu serveur, `usePathname()` voit donc le chemin **interne**, alors que le
 * navigateur, lui, voit le chemin public. Un composant client qui déduit un
 * libellé du chemin rendrait deux textes différents de part et d'autre — et
 * React signale l'écart comme une erreur d'hydratation.
 *
 * Normaliser des deux côtés supprime la divergence : un chemin déjà public est
 * rendu tel quel, un chemin interne est traduit.
 */
export function publicPathname(locale: Locale, pathname: string): string {
  const trimmed = pathname.replace(/^\/+/, "");
  const prefix = `${locale}/`;
  if (!trimmed.startsWith(prefix)) return pathname;

  const rest = trimmed.slice(prefix.length);
  const canonical = toPublicPath(locale, rest);
  return canonical === null ? pathname : `/${locale}/${canonical}`;
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
