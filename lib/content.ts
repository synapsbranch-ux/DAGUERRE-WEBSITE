import { tryConnectToDatabase } from "@/lib/db/client";
import {
  HomeSectionModel,
  MediaModel,
  PageModel,
  PostModel,
  ProfileModel,
  ProjectModel,
  ResearchModel,
  ServiceModel,
  SettingModel,
  SkillModel,
  SocialLinkModel,
  TaxonomyModel,
} from "@/lib/db/models";
import { pickLocale, type LocalizedString } from "@/lib/db/models/shared";
import { defaultLocale, locales, type Locale } from "@/lib/i18n";
import { resolveImage } from "@/lib/media/resolve";
import type {
  EditorialPage,
  HomeSection,
  Paginated,
  PageCertification,
  PageEntry,
  PageItem,
  PageSection,
  PageTimelineEntry,
  Post,
  Profile,
  Project,
  ResearchEntry,
  Service,
  SiteSettings,
  SkillGroup,
  SlugSet,
  SocialLink,
  Taxonomy,
} from "@/lib/types";

/**
 * Accès en lecture aux contenus publiés.
 *
 * ## Règle unique de visibilité
 *
 * `published()` est la **seule** porte d'entrée publique : `status` vaut
 * `published` et `publishedAt` est déjà passée. Un brouillon, un contenu
 * archivé ou une parution planifiée dans le futur sont donc invisibles quelle
 * que soit la page qui interroge — y compris par son slug exact.
 *
 * ## Dégradation
 *
 * Sans base joignable, les lectures renvoient des collections vides plutôt que
 * de lever : le site reste consultable, simplement sans contenu.
 */

type Doc = Record<string, unknown>;

const local = (value: unknown, locale: Locale) => pickLocale(value as LocalizedString | undefined, locale);
const optional = (value: unknown, locale: Locale) => local(value, locale) || undefined;
const array = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const iso = (value: unknown): string | undefined => (value instanceof Date ? value.toISOString() : undefined);
const slugs = (value: unknown): SlugSet =>
  Object.fromEntries(locales.map((locale) => [locale, local(value, locale)])) as SlugSet;

const published = () => ({ status: "published", publishedAt: { $lte: new Date() } });

/** Les services n'ont pas de date de parution : seul leur statut compte. */
const publishedService = () => ({ status: "published" });

/**
 * Recherche par slug.
 *
 * Un contenu non traduit garde son slug français dans les deux langues :
 * `/en/blog/mon-article` doit donc rester résolvable.
 */
const slugQuery = (slug: string, locale: Locale) => ({
  $or: [{ [`slug.${locale}`]: slug }, { "slug.fr": slug }],
});

async function connected() {
  return tryConnectToDatabase();
}

/* ------------------------------------------------------------------ */
/* Projections                                                         */
/* ------------------------------------------------------------------ */

function toProject(doc: Doc, locale: Locale): Project {
  return {
    slug: local(doc.slug, locale),
    slugs: slugs(doc.slug),
    title: local(doc.title, locale),
    kicker: optional(doc.kicker, locale),
    summary: local(doc.summary, locale) || local(doc.excerpt, locale),
    body: optional(doc.body, locale),
    categories: array(doc.categories),
    tags: array(doc.tags),
    technologies: array(doc.technologies),
    year: typeof doc.year === "number" ? doc.year : new Date(iso(doc.publishedAt) ?? Date.now()).getFullYear(),
    featured: Boolean(doc.featured),
    image: resolveImage(doc.coverImage),
    gallery: array(doc.gallery).filter((entry) => resolveImage(entry) !== undefined),
    client: text(doc.client),
    role: text(doc.role),
    problem: optional(doc.problem, locale),
    methodology: optional(doc.methodology, locale),
    results: optional(doc.results, locale),
    lessons: optional(doc.lessons, locale),
    link: text(doc.externalUrl) ?? text(doc.link),
    publishedAt: iso(doc.publishedAt),
    updatedAt: iso(doc.updatedAt),
    seoTitle: optional(doc.seoTitle, locale),
    seoDescription: optional(doc.seoDescription, locale),
    ogImage: resolveImage(doc.ogImage),
  };
}

function toPost(doc: Doc, locale: Locale): Post {
  return {
    slug: local(doc.slug, locale),
    slugs: slugs(doc.slug),
    title: local(doc.title, locale),
    excerpt: local(doc.excerpt, locale),
    body: optional(doc.body, locale),
    publishedAt: iso(doc.publishedAt) ?? iso(doc.createdAt) ?? new Date().toISOString(),
    updatedAt: iso(doc.updatedAt),
    categories: array(doc.categories),
    tags: array(doc.tags),
    author: text(doc.author),
    featured: Boolean(doc.featured),
    image: resolveImage(doc.coverImage),
    readingTime: typeof doc.readingTime === "number" && doc.readingTime > 0 ? doc.readingTime : undefined,
    seoTitle: optional(doc.seoTitle, locale),
    seoDescription: optional(doc.seoDescription, locale),
    ogImage: resolveImage(doc.ogImage),
  };
}

function toService(doc: Doc, locale: Locale): Service {
  return {
    slug: local(doc.slug, locale),
    slugs: slugs(doc.slug),
    title: local(doc.title, locale) || String(doc.name ?? ""),
    summary: local(doc.summary, locale) || local(doc.shortDescription, locale),
    body: optional(doc.body, locale) ?? optional(doc.description, locale),
    features: array(doc.features),
    deliverables: array(doc.deliverables),
    icon: text(doc.icon),
    image: resolveImage(doc.coverImage),
    order: typeof doc.order === "number" ? doc.order : 0,
    featured: Boolean(doc.featured),
    seoTitle: optional(doc.seoTitle, locale),
    seoDescription: optional(doc.seoDescription, locale),
    ogImage: resolveImage(doc.ogImage),
  };
}

function toResearch(doc: Doc, locale: Locale): ResearchEntry {
  return {
    id: String(doc._id ?? ""),
    slug: local(doc.slug, locale),
    slugs: slugs(doc.slug),
    title: local(doc.title, locale),
    summary: local(doc.summary, locale) || local(doc.excerpt, locale),
    body: optional(doc.body, locale),
    type: text(doc.type),
    year: typeof doc.year === "number" ? doc.year : undefined,
    institution: text(doc.institution),
    authors: array(doc.authors),
    tags: array(doc.tags),
    documentUrl: text(doc.documentUrl),
    externalUrl: text(doc.externalUrl),
    image: resolveImage(doc.coverImage),
    featured: Boolean(doc.featured),
    publishedAt: iso(doc.publishedAt),
    seoTitle: optional(doc.seoTitle, locale),
    seoDescription: optional(doc.seoDescription, locale),
    ogImage: resolveImage(doc.ogImage),
  };
}

/* ------------------------------------------------------------------ */
/* Lectures génériques                                                 */
/* ------------------------------------------------------------------ */

type QueryModel = {
  find: (filter: object) => {
    sort: (order: object) => {
      skip: (amount: number) => { limit: (amount: number) => { lean: () => Promise<unknown> } };
      limit: (amount: number) => { lean: () => Promise<unknown> };
      lean: () => Promise<unknown>;
    };
  };
  countDocuments: (filter: object) => Promise<number>;
  findOne: (filter: object) => { lean: () => Promise<unknown> };
  distinct: (field: string, filter: object) => Promise<unknown[]>;
};

async function find(model: unknown, query: object, sort: object, limit?: number): Promise<Doc[]> {
  if (!(await connected())) return [];
  const typed = model as QueryModel;
  const cursor = typed.find(query).sort(sort);
  const result = limit ? await cursor.limit(limit).lean() : await cursor.lean();
  return result as Doc[];
}

async function findOne(model: unknown, query: object): Promise<Doc | null> {
  if (!(await connected())) return null;
  const result = await (model as QueryModel).findOne(query).lean();
  return (result as Doc | null) ?? null;
}

/** Page de résultats + total, en une seule aller-retour logique. */
async function findPage(
  model: unknown,
  query: object,
  sort: object,
  page: number,
  perPage: number,
): Promise<{ docs: Doc[]; total: number }> {
  if (!(await connected())) return { docs: [], total: 0 };
  const typed = model as QueryModel;
  const [docs, total] = await Promise.all([
    typed
      .find(query)
      .sort(sort)
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean() as Promise<unknown>,
    typed.countDocuments(query),
  ]);
  return { docs: docs as Doc[], total };
}

function paginate<T>(items: T[], total: number, page: number, perPage: number): Paginated<T> {
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / perPage)) };
}

/** Échappe une saisie utilisateur avant de la passer à `$regex`. */
function safeRegex(value: string) {
  return { $regex: value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
}

/* ------------------------------------------------------------------ */
/* Réalisations                                                        */
/* ------------------------------------------------------------------ */

export async function getProjects(locale: Locale = defaultLocale) {
  return (await find(ProjectModel, published(), { year: -1, publishedAt: -1 })).map((doc) => toProject(doc, locale));
}

export async function getFeaturedProjects(locale: Locale = defaultLocale, limit = 3) {
  return (await find(ProjectModel, { ...published(), featured: true }, { year: -1, publishedAt: -1 }, limit)).map(
    (doc) => toProject(doc, locale),
  );
}

export async function getProjectBySlug(slug: string, locale: Locale = defaultLocale) {
  const doc = await findOne(ProjectModel, { ...published(), ...slugQuery(slug, locale) });
  return doc ? toProject(doc, locale) : null;
}

export type ProjectFilters = {
  category?: string;
  technology?: string;
  year?: number;
  page?: number;
  perPage?: number;
};

export async function getProjectsPage(
  { category, technology, year, page = 1, perPage = 9 }: ProjectFilters,
  locale: Locale = defaultLocale,
): Promise<Paginated<Project>> {
  const query: Doc = { ...published() };
  if (category) query.categories = category;
  if (technology) query.technologies = technology;
  if (year) query.year = year;

  const { docs, total } = await findPage(ProjectModel, query, { year: -1, publishedAt: -1 }, page, perPage);
  return paginate(docs.map((doc) => toProject(doc, locale)), total, page, perPage);
}

/** Valeurs disponibles pour les filtres, calculées sur les seuls projets publiés. */
export async function getProjectFacets(): Promise<{
  categories: string[];
  technologies: string[];
  years: number[];
}> {
  if (!(await connected())) return { categories: [], technologies: [], years: [] };
  const model = ProjectModel as unknown as QueryModel;
  const [categories, technologies, years] = await Promise.all([
    model.distinct("categories", published()),
    model.distinct("technologies", published()),
    model.distinct("year", published()),
  ]);
  return {
    categories: (categories as unknown[]).filter((v): v is string => typeof v === "string").sort(),
    technologies: (technologies as unknown[]).filter((v): v is string => typeof v === "string").sort(),
    years: (years as unknown[]).filter((v): v is number => typeof v === "number").sort((a, b) => b - a),
  };
}

/**
 * Projets apparentés — même schéma que `getRelatedPosts` : d'abord par
 * catégorie ou technologie partagée, puis en repli les plus récents.
 * `limit + 1` couvre le cas où le projet courant se trouve dans le repli.
 */
export async function getRelatedProjects(
  project: Project,
  locale: Locale = defaultLocale,
  limit = 3,
): Promise<Project[]> {
  const taxonomies = [...project.categories, ...project.technologies];
  const exclude = { "slug.fr": { $ne: project.slugs.fr } };

  if (taxonomies.length > 0) {
    const related = await find(
      ProjectModel,
      {
        ...published(),
        ...exclude,
        $or: [{ categories: { $in: project.categories } }, { technologies: { $in: project.technologies } }],
      },
      { year: -1, publishedAt: -1 },
      limit,
    );
    if (related.length > 0) return related.map((doc) => toProject(doc, locale));
  }

  return (await find(ProjectModel, { ...published(), ...exclude }, { year: -1, publishedAt: -1 }, limit)).map(
    (doc) => toProject(doc, locale),
  );
}

/**
 * Projet précédent / suivant dans l'ordre de tri du portfolio (année, puis
 * date de parution) — pour la navigation de bas de page d'une réalisation.
 */
export async function getAdjacentProjects(
  project: Project,
  locale: Locale = defaultLocale,
): Promise<{ previous: Project | null; next: Project | null }> {
  const all = await getProjects(locale);
  const index = all.findIndex((entry) => entry.slug === project.slug || entry.slugs.fr === project.slugs.fr);
  if (index === -1) return { previous: null, next: null };

  return {
    previous: all[index + 1] ?? null,
    next: all[index - 1] ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Articles                                                            */
/* ------------------------------------------------------------------ */

export async function getPosts(locale: Locale = defaultLocale) {
  return (await find(PostModel, published(), { publishedAt: -1 })).map((doc) => toPost(doc, locale));
}

export async function getRecentPosts(limit = 3, locale: Locale = defaultLocale) {
  return (await find(PostModel, published(), { publishedAt: -1 }, limit)).map((doc) => toPost(doc, locale));
}

export async function getFeaturedPosts(locale: Locale = defaultLocale, limit = 3) {
  return (await find(PostModel, { ...published(), featured: true }, { publishedAt: -1 }, limit)).map((doc) =>
    toPost(doc, locale),
  );
}

export async function getPostBySlug(slug: string, locale: Locale = defaultLocale) {
  const doc = await findOne(PostModel, { ...published(), ...slugQuery(slug, locale) });
  return doc ? toPost(doc, locale) : null;
}

export type PostFilters = {
  q?: string;
  category?: string;
  tag?: string;
  page?: number;
  perPage?: number;
};

export async function getPostsPage(
  { q, category, tag, page = 1, perPage = 10 }: PostFilters,
  locale: Locale = defaultLocale,
): Promise<Paginated<Post>> {
  const query: Doc = { ...published() };
  if (category) query.categories = category;
  if (tag) query.tags = tag;
  if (q?.trim()) {
    const regex = safeRegex(q.trim());
    query.$and = [
      {
        $or: [
          { "title.fr": regex },
          { "title.en": regex },
          { "excerpt.fr": regex },
          { "excerpt.en": regex },
          { "body.fr": regex },
          { "body.en": regex },
        ],
      },
    ];
  }

  const { docs, total } = await findPage(PostModel, query, { publishedAt: -1 }, page, perPage);
  return paginate(docs.map((doc) => toPost(doc, locale)), total, page, perPage);
}

export async function getPostsByCategory(slug: string, locale: Locale = defaultLocale) {
  return (await find(PostModel, { ...published(), categories: slug }, { publishedAt: -1 })).map((doc) =>
    toPost(doc, locale),
  );
}

export async function getPostsByTag(slug: string, locale: Locale = defaultLocale) {
  return (await find(PostModel, { ...published(), tags: slug }, { publishedAt: -1 })).map((doc) => toPost(doc, locale));
}

/**
 * Articles liés : ceux qui partagent une catégorie ou un tag, l'article courant
 * exclu. Sans recoupement, on retombe sur les publications les plus récentes
 * — une section « articles liés » vide n'apporte rien au lecteur.
 */
export async function getRelatedPosts(post: Post, locale: Locale = defaultLocale, limit = 3): Promise<Post[]> {
  const taxonomies = [...post.categories, ...post.tags];
  const exclude = { "slug.fr": { $ne: post.slugs.fr } };

  if (taxonomies.length > 0) {
    const related = await find(
      PostModel,
      { ...published(), ...exclude, $or: [{ categories: { $in: post.categories } }, { tags: { $in: post.tags } }] },
      { publishedAt: -1 },
      limit,
    );
    if (related.length > 0) return related.map((doc) => toPost(doc, locale));
  }

  return (await find(PostModel, { ...published(), ...exclude }, { publishedAt: -1 }, limit)).map((doc) =>
    toPost(doc, locale),
  );
}

async function taxonomies(kind: "category" | "tag", locale: Locale): Promise<Taxonomy[]> {
  return (await find(TaxonomyModel, { kind }, { slug: 1 })).map((doc) => ({
    slug: String(doc.slug ?? ""),
    name: local(doc.name, locale),
    description: optional(doc.description, locale),
  }));
}

/**
 * Catégories et tags proposés au lecteur.
 *
 * Les entrées déclarées dans `Taxonomy` portent un libellé traduit ; celles
 * qui n'existent que sur les articles sont ajoutées avec leur slug comme
 * libellé, faute de quoi une catégorie utilisée mais non déclarée resterait
 * invisible dans le blogue.
 */
async function blogTaxonomies(kind: "category" | "tag", locale: Locale): Promise<Taxonomy[]> {
  if (!(await connected())) return [];
  const declared = await taxonomies(kind, locale);
  const field = kind === "category" ? "categories" : "tags";
  const used = (await (PostModel as unknown as QueryModel).distinct(field, published())).filter(
    (value): value is string => typeof value === "string",
  );

  const known = new Set(declared.map((entry) => entry.slug));
  const extra = used.filter((slug) => !known.has(slug)).map((slug) => ({ slug, name: slug }));

  return [...declared.filter((entry) => used.includes(entry.slug)), ...extra].sort((a, b) =>
    a.name.localeCompare(b.name, locale),
  );
}

export const getBlogCategories = (locale: Locale = defaultLocale) => blogTaxonomies("category", locale);
export const getBlogTags = (locale: Locale = defaultLocale) => blogTaxonomies("tag", locale);

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

export async function getServices(locale: Locale = defaultLocale) {
  return (await find(ServiceModel, publishedService(), { order: 1, updatedAt: -1 })).map((doc) =>
    toService(doc, locale),
  );
}

export async function getServiceBySlug(slug: string, locale: Locale = defaultLocale) {
  const doc = await findOne(ServiceModel, { ...publishedService(), ...slugQuery(slug, locale) });
  return doc ? toService(doc, locale) : null;
}

/* ------------------------------------------------------------------ */
/* Recherche, compétences, liens                                       */
/* ------------------------------------------------------------------ */

export async function getResearch(locale: Locale = defaultLocale): Promise<ResearchEntry[]> {
  return (await find(ResearchModel, published(), { year: -1, publishedAt: -1 })).map((doc) =>
    toResearch(doc, locale),
  );
}

export async function getResearchBySlug(slug: string, locale: Locale = defaultLocale) {
  const doc = await findOne(ResearchModel, { ...published(), ...slugQuery(slug, locale) });
  return doc ? toResearch(doc, locale) : null;
}

export async function getSkills(locale: Locale = defaultLocale): Promise<SkillGroup[]> {
  const docs = await find(SkillModel, { enabled: true }, { category: 1, order: 1, name: 1 });
  const groups = new Map<string, SkillGroup>();

  for (const doc of docs) {
    const category = String(doc.category || "Compétences");
    const group = groups.get(category) ?? {
      slug: category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: category,
      description: optional(doc.description, locale),
      skills: [],
    };
    group.skills.push({
      name: String(doc.name ?? ""),
      icon: text(doc.icon),
      featured: Boolean(doc.featured),
    });
    groups.set(category, group);
  }

  return [...groups.values()];
}

export async function getSocialLinks(): Promise<SocialLink[]> {
  return (await find(SocialLinkModel, { enabled: true }, { order: 1 }))
    .map((doc) => ({
      id: String(doc._id ?? ""),
      platform: String(doc.platform ?? ""),
      label: String(doc.label ?? doc.platform ?? ""),
      url: String(doc.url ?? ""),
      order: typeof doc.order === "number" ? doc.order : 0,
    }))
    .filter((link) => /^https?:\/\/\S+$/.test(link.url));
}

/* ------------------------------------------------------------------ */
/* Réglages, profil et pages                                           */
/* ------------------------------------------------------------------ */

export async function getSiteSettings(locale: Locale = defaultLocale): Promise<SiteSettings | null> {
  const doc = await findOne(SettingModel, { key: "site" });
  if (!doc) return null;

  return {
    brandName: String(doc.brandName || "Daguerre"),
    baseline: optional(doc.baseline, locale),
    title: optional(doc.title, locale),
    description: optional(doc.description, locale),
    email: text(doc.email),
    phone: text(doc.phone),
    city: text(doc.city),
    region: text(doc.region),
    country: text(doc.country),
    cvUrl: text(doc.cvUrl),
    calendlyUrl: text(doc.calendlyUrl),
    canonicalUrl: text(doc.canonicalUrl),
    heroEyebrow: optional(doc.heroEyebrow, locale),
    heroTitle: optional(doc.heroTitle, locale),
    heroLead: optional(doc.heroLead, locale),
    heroImage: resolveImage(doc.heroImage),
    defaultOgImage: resolveImage(doc.defaultOgImage),
    footerText: optional(doc.footerText, locale),
    stats: Array.isArray(doc.stats)
      ? (doc.stats as Doc[])
          .map((stat) => ({ value: String(stat.value ?? ""), label: local(stat.label, locale) }))
          .filter((stat) => stat.value && stat.label)
      : [],
  };
}

export async function getProfile(locale: Locale = defaultLocale): Promise<Profile | null> {
  const doc = await findOne(ProfileModel, { key: "profile" });
  if (!doc) return null;

  const entries = (value: unknown) =>
    Array.isArray(value)
      ? (value as Doc[])
          .map((entry) => ({ title: String(entry.title ?? ""), detail: text(entry.detail) }))
          .filter((entry) => entry.title)
      : [];

  return {
    name: String(doc.name ?? ""),
    professionalTitle: optional(doc.professionalTitle, locale),
    headline: optional(doc.headline, locale),
    shortBio: optional(doc.shortBio, locale),
    longBio: optional(doc.longBio, locale),
    email: text(doc.email),
    location: text(doc.location),
    portrait: resolveImage(doc.portrait),
    cvUrl: text(doc.cvUrl),
    education: entries(doc.education),
    experience: entries(doc.experience),
    certifications: array(doc.certifications),
  };
}

export async function getPage(key: string, locale: Locale = defaultLocale): Promise<EditorialPage | null> {
  const doc = await findOne(PageModel, { key });
  if (!doc) return null;

  const sections = (value: unknown): PageSection[] =>
    Array.isArray(value)
      ? (value as Doc[])
          .map((entry) => ({
            title: local(entry.title, locale),
            body: local(entry.body, locale),
            image: resolveImage(entry.image),
          }))
          .filter((entry) => entry.title || entry.body || entry.image)
      : [];

  const timeline = (value: unknown): PageTimelineEntry[] =>
    Array.isArray(value)
      ? (value as Doc[])
          .map((entry) => ({
            period: text(entry.period),
            title: local(entry.title, locale),
            detail: optional(entry.detail, locale),
            image: resolveImage(entry.image),
          }))
          .filter((entry) => entry.title)
      : [];

  const items = (value: unknown): PageItem[] =>
    Array.isArray(value)
      ? (value as Doc[])
          .map((entry) => ({
            title: local(entry.title, locale),
            detail: optional(entry.detail, locale),
            image: resolveImage(entry.image),
            url: text(entry.url),
          }))
          .filter((entry) => entry.title)
      : [];

  const parcours = (value: unknown): PageEntry[] =>
    Array.isArray(value)
      ? (value as Doc[])
          .map((entry) => ({
            title: local(entry.title, locale),
            organisation: text(entry.organisation),
            period: text(entry.period),
            detail: optional(entry.detail, locale),
          }))
          .filter((entry) => entry.title)
      : [];

  const certifications = (value: unknown): PageCertification[] =>
    Array.isArray(value)
      ? (value as Doc[])
          .map((entry) => ({
            name: String(entry.name ?? ""),
            issuer: text(entry.issuer),
            year: text(entry.year),
          }))
          .filter((entry) => entry.name)
      : [];

  return {
    key,
    title: local(doc.title, locale),
    subtitle: optional(doc.subtitle, locale),
    body: optional(doc.body, locale),
    heroImage: resolveImage(doc.heroImage),
    mission: optional(doc.mission, locale),
    vision: optional(doc.vision, locale),
    sections: sections(doc.sections),
    timeline: timeline(doc.timeline),
    items: items(doc.items),
    entries: parcours(doc.entries),
    certifications: certifications(doc.certifications),
    media: array(doc.media).filter((entry) => resolveImage(entry) !== undefined),
    documentUrl: text(doc.documentUrl),
    ctaLabel: optional(doc.ctaLabel, locale),
    ctaHref: text(doc.ctaHref),
  };
}

/**
 * Composition de l'accueil.
 *
 * Renvoie une carte `clé → section` : les composants restent responsables de
 * leur rendu, le CMS de l'ordre, de la visibilité et des textes d'en-tête.
 */
export async function getHomeSections(locale: Locale = defaultLocale): Promise<HomeSection[]> {
  return (await find(HomeSectionModel, {}, { order: 1 })).map((doc) => ({
    key: String(doc.key ?? ""),
    order: typeof doc.order === "number" ? doc.order : 0,
    visible: doc.visible !== false,
    eyebrow: optional(doc.eyebrow, locale),
    title: optional(doc.title, locale),
    lead: optional(doc.lead, locale),
    image: resolveImage(doc.image),
  }));
}

export { MediaModel };
