import type { Locale } from "@/lib/i18n";

/**
 * Modèles de contenu **résolus pour une locale**.
 *
 * La base stocke des champs bilingues (`{ fr, en }`) ; la couche `lib/content`
 * les aplatit pour la locale demandée. Les composants d'affichage ne
 * manipulent donc jamais que des chaînes.
 */

/** Slugs dans toutes les locales — indispensable pour les `hreflang`. */
export type SlugSet = Record<Locale, string>;

export type Taxonomy = {
  slug: string;
  name: string;
  description?: string;
};

/** Métadonnées de référencement propres à un contenu. */
export type Seo = {
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
};

/** Une réalisation / un projet. */
export type Project = Seo & {
  slug: string;
  slugs: SlugSet;
  title: string;
  kicker?: string;
  summary: string;
  /** Contenu long de la page détaillée, en Markdown. */
  body?: string;
  categories: string[];
  tags: string[];
  technologies: string[];
  year: number;
  featured: boolean;
  image?: string;
  /** Images additionnelles de la page détaillée. */
  gallery: string[];
  client?: string;
  role?: string;
  /** Les quatre volets de l'étude de cas. */
  problem?: string;
  methodology?: string;
  results?: string;
  lessons?: string;
  /** Lien externe : démo, dépôt, publication. */
  link?: string;
  publishedAt?: string;
  updatedAt?: string;
};

/** Un article de blogue. */
export type Post = Seo & {
  slug: string;
  slugs: SlugSet;
  title: string;
  excerpt: string;
  /** Corps de l'article, en Markdown. */
  body?: string;
  /** Date ISO (AAAA-MM-JJ). */
  publishedAt: string;
  updatedAt?: string;
  /** Slugs de catégories et de tags. */
  categories: string[];
  tags: string[];
  author?: string;
  featured: boolean;
  image?: string;
  readingTime?: number;
};

/** Un service Datakle. */
export type Service = Seo & {
  slug: string;
  slugs: SlugSet;
  title: string;
  summary: string;
  body?: string;
  features: string[];
  deliverables: string[];
  icon?: string;
  image?: string;
  order: number;
  featured: boolean;
};

/** Un travail de recherche publié. */
export type ResearchEntry = Seo & {
  id: string;
  slug: string;
  slugs: SlugSet;
  title: string;
  summary: string;
  body?: string;
  type?: string;
  year?: number;
  institution?: string;
  authors: string[];
  tags: string[];
  documentUrl?: string;
  externalUrl?: string;
  image?: string;
  featured: boolean;
  publishedAt?: string;
};

/** Un groupe de compétences. */
export type SkillGroup = {
  slug: string;
  name: string;
  description?: string;
  skills: { name: string; icon?: string; featured: boolean }[];
};

/** Un lien social actif. */
export type SocialLink = {
  id: string;
  platform: string;
  label: string;
  url: string;
  order: number;
};

/** Contenu d'une section de l'accueil, résolu pour une locale. */
export type HomeSection = {
  key: string;
  order: number;
  visible: boolean;
  eyebrow?: string;
  title?: string;
  lead?: string;
  image?: string;
};

/** Bloc « titre / texte / image » d'une page éditoriale. */
export type PageSection = {
  title: string;
  body: string;
  image?: string;
};

/** Étape de frise chronologique. */
export type PageTimelineEntry = {
  period?: string;
  title: string;
  detail?: string;
  image?: string;
};

/** Élément de liste illustrée : valeur, initiative, projet. */
export type PageItem = {
  title: string;
  detail?: string;
  image?: string;
  url?: string;
};

/** Ligne de parcours : poste ou diplôme. */
export type PageEntry = {
  title: string;
  organisation?: string;
  period?: string;
  detail?: string;
};

export type PageCertification = {
  name: string;
  issuer?: string;
  year?: string;
};

/** Page éditoriale singleton, résolue pour une locale. */
export type EditorialPage = {
  key: string;
  title: string;
  subtitle?: string;
  body?: string;
  heroImage?: string;
  mission?: string;
  vision?: string;
  sections: PageSection[];
  timeline: PageTimelineEntry[];
  items: PageItem[];
  entries: PageEntry[];
  certifications: PageCertification[];
  media: string[];
  documentUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

/** Profil public, résolu pour une locale. */
export type Profile = {
  name: string;
  professionalTitle?: string;
  headline?: string;
  shortBio?: string;
  longBio?: string;
  email?: string;
  location?: string;
  portrait?: string;
  cvUrl?: string;
  education: { title: string; detail?: string }[];
  experience: { title: string; detail?: string }[];
  certifications: string[];
};

/** Réglages du site, résolus pour une locale. */
export type SiteSettings = {
  brandName: string;
  baseline?: string;
  title?: string;
  description?: string;
  email?: string;
  phone?: string;
  city?: string;
  region?: string;
  country?: string;
  cvUrl?: string;
  calendlyUrl?: string;
  canonicalUrl?: string;
  heroEyebrow?: string;
  heroTitle?: string;
  heroLead?: string;
  heroImage?: string;
  defaultOgImage?: string;
  footerText?: string;
  stats: { value: string; label: string }[];
};

/** Résultat paginé d'une liste publique. */
export type Paginated<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
};
