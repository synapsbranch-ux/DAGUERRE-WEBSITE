/**
 * Configuration globale du site.
 * Point unique de vérité pour la navigation, les liens sociaux et le SEO.
 */

/**
 * URL canonique du site.
 *
 * Définir `NEXT_PUBLIC_SITE_URL` en production (ex. https://daguerre.com) :
 * toutes les URLs canoniques, Open Graph, le sitemap et le robots.txt en
 * dépendent. Sans cette variable, on retombe sur l'URL par défaut ci-dessous.
 */
/** Repli de dernier recours — voir `isPlaceholderSiteUrl()`. */
const PLACEHOLDER_SITE_URL = "https://daguerre.example.com";

function resolveSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : PLACEHOLDER_SITE_URL);

  // Pas de barre oblique finale : les chemins sont toujours concaténés ensuite.
  return raw.replace(/\/+$/, "");
}

export const siteUrl = resolveSiteUrl();

/**
 * Le site tourne-t-il encore sur l'URL de repli ?
 *
 * Le repli existe pour que `next build` passe sans secrets — la compilation n'a
 * aucun besoin de connaître le domaine. Mais s'il survit jusqu'en production,
 * les URL canoniques, l'Open Graph, le sitemap et les liens des courriels
 * désignent tous un domaine qui n'existe pas, sans que rien ne plante.
 *
 * `NEXT_PUBLIC_SITE_URL` est figée à la compilation : une vérification
 * d'exécution sur `process.env` ne verrait rien. C'est la constante déjà
 * résolue qu'il faut interroger, et c'est ce que fait `/api/health`.
 */
export function isPlaceholderSiteUrl(): boolean {
  return siteUrl === PLACEHOLDER_SITE_URL;
}

export const siteConfig = {
  name: "Daguerre",
  shortName: "Daguerre",
  title: "Daguerre — Analyste de données & gestion de projet",
  description:
    "Analyste de données et gestionnaire de projet : business intelligence, tableaux de bord, suivi-évaluation et recherche. Ingénieur-agronome spécialisé en économie, MBA en analytique d'affaires. Fondateur de Datakle.",
  url: siteUrl,
  locale: "fr_CA",
  lang: "fr",
  /** Baseline affichée à côté de la marque, dans l'en-tête. */
  baseline: {
    fr: "Données & décision",
    en: "Data & decision",
  },
  /** Ville / région principale — utile pour le référencement local. */
  location: {
    city: "Québec",
    region: "QC",
    country: "CA",
  },
  /** Couleur de thème (manifest + barre du navigateur mobile). */
  themeColor: "#07111f",
  /** Code Google Search Console (balise meta). Renseigner via variable d'env. */
  googleSiteVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
} as const;

/**
 * Mots-clés généraux du site. Google ne les utilise plus pour le classement,
 * mais ils servent de référence pour rédiger titres et descriptions, et
 * restent lus par d'autres moteurs.
 */
export const siteKeywords = [
  "analyste de données",
  "data analyst",
  "business intelligence",
  "tableau de bord",
  "Power BI",
  "SQL",
  "Python",
  "Excel VBA",
  "gestion de projet",
  "suivi-évaluation",
  "recherche",
  "analytique d'affaires",
  "ingénieur agronome",
  "Datakle",
  "Haïti",
  "Québec",
];

/** Informations utilisées par les données structurées `Person`. */
export const person = {
  name: "Daguerre",
  jobTitle: "Analyste de données et gestionnaire de projet",
  description:
    "Ingénieur-agronome spécialisé en économie et titulaire d'un MBA en analytique d'affaires. J'accompagne les organisations dans l'analyse de leurs données, le suivi-évaluation et la gestion de projet.",
  knowsAbout: [
    "Analyse de données",
    "Business intelligence",
    "Visualisation de données",
    "SQL",
    "Python",
    "Excel et VBA",
    "Gestion de projet",
    "Suivi-évaluation",
    "Recherche appliquée",
    "Stratégie",
  ],
};

/** Informations utilisées par les données structurées `Organization` (Datakle). */
export const organization = {
  name: "Datakle",
  description:
    "Datakle démocratise la donnée : accompagnement, formation et solutions analytiques pour les organisations.",
  url: `${siteUrl}/datakle`,
};

/*
 * La navigation vit désormais dans `lib/routes.ts` et
 * `components/layout/Navigation.tsx` : les libellés y sont bilingues et les
 * URL passent par `href()`, seul moyen d'obtenir les slugs anglais traduits.
 */

export type SocialLink = {
  /** Identifiant stable, utile pour associer une icône plus tard. */
  key: "linkedin" | "github" | "youtube" | "medium" | "instagram";
  label: string;
  href: string;
};

/**
 * Présence numérique. URLs à compléter : elles alimentent aussi la propriété
 * `sameAs` des données structurées, qui aide Google à relier le site aux
 * profils officiels (Knowledge Graph).
 */
export const socialLinks: SocialLink[] = [
  { key: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/" },
  { key: "github", label: "GitHub", href: "https://github.com/" },
  { key: "youtube", label: "YouTube", href: "https://www.youtube.com/" },
  { key: "medium", label: "Medium", href: "https://medium.com/" },
  { key: "instagram", label: "Instagram", href: "https://www.instagram.com/" },
];

/** URLs des profils officiels, pour `sameAs`. */
export const sameAs = socialLinks.map((link) => link.href);

/** Construit une URL absolue à partir d'un chemin interne. */
export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
