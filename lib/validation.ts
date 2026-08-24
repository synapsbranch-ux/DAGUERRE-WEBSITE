import { z } from "zod";

/**
 * Schémas d'entrée du tableau de bord.
 *
 * Chaque ressource a son schéma : il décrit **exactement** les champs que le
 * formulaire correspondant expose, ni plus ni moins. Un champ absent d'ici
 * n'est jamais écrit en base, et un champ affiché dans un formulaire doit
 * obligatoirement y figurer — c'est ce qui garantit qu'aucune saisie n'est
 * silencieusement perdue.
 */

const text = (max = 10_000) => z.string().trim().max(max);

/** Lien externe : http(s) absolu, ou vide. */
export const absoluteUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => value === "" || /^https?:\/\/\S+$/.test(value), {
    message: "URL absolue (http:// ou https://) attendue.",
  });

/**
 * Référence d'image.
 *
 * Accepte une URL absolue **ou** un média GridFS servi par `/api/media/<id>`.
 * Sans ce second cas, une image téléversée depuis le CMS serait refusée par la
 * validation et ne pourrait jamais servir de couverture, de portrait ou
 * d'image Open Graph.
 */
export const imageRef = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) =>
      value === "" ||
      /^https?:\/\/\S+$/.test(value) ||
      /^\/api\/media\/[a-f0-9]{24}$/.test(value),
    { message: "URL absolue ou média de la bibliothèque (/api/media/…) attendu." },
  );

/** Slug technique : minuscules, chiffres et tirets simples. */
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugSchema = z
  .string()
  .trim()
  .min(1, "Le slug est obligatoire.")
  .max(120)
  .regex(slugPattern, "Minuscules, chiffres et tirets uniquement.");

/**
 * Texte bilingue. Le français est la langue d'édition de référence ; l'anglais
 * est facultatif et l'affichage public retombe sur le français.
 */
export const localizedSchema = z.object({
  fr: text(),
  en: text().optional().default(""),
});

/** Variante dont le français est obligatoire (titres, intitulés). */
export const requiredLocalizedSchema = z.object({
  fr: text().min(1, "Le texte français est obligatoire."),
  en: text().optional().default(""),
});

/** Slug bilingue : le français fait foi, l'anglais est optionnel. */
export const localizedSlugSchema = z.object({
  fr: slugSchema,
  en: z
    .string()
    .trim()
    .max(120)
    .refine((value) => value === "" || slugPattern.test(value), {
      message: "Minuscules, chiffres et tirets uniquement.",
    })
    .optional()
    .default(""),
});

export const contentStatusSchema = z.enum(["draft", "published", "archived"]);

/** Date ISO complète, ou vide quand la publication n'est pas datée. */
const isoDate = z
  .string()
  .trim()
  .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), {
    message: "Date invalide.",
  })
  .optional()
  .default("");

const year = z.number().int().min(1900).max(2100).nullable().optional();

const stringList = (max = 80, limit = 60) => z.array(text(max).min(1)).max(limit).default([]);

/** Champs communs à tous les contenus éditoriaux publiables. */
const editorial = {
  slug: localizedSlugSchema,
  title: requiredLocalizedSchema,
  excerpt: localizedSchema.optional().default({ fr: "", en: "" }),
  body: localizedSchema.optional().default({ fr: "", en: "" }),
  status: contentStatusSchema.default("draft"),
  featured: z.boolean().default(false),
  publishedAt: isoDate,
  coverImage: imageRef.optional().default(""),
  seoTitle: localizedSchema.optional().default({ fr: "", en: "" }),
  seoDescription: localizedSchema.optional().default({ fr: "", en: "" }),
  ogImage: imageRef.optional().default(""),
  categories: stringList(),
  tags: stringList(),
};

export const postInputSchema = z.object({
  ...editorial,
  author: text(160).optional().default(""),
  readingTime: z.number().int().min(0).max(600).optional().default(0),
});

export const projectInputSchema = z.object({
  ...editorial,
  kicker: localizedSchema.optional().default({ fr: "", en: "" }),
  summary: localizedSchema.optional().default({ fr: "", en: "" }),
  technologies: stringList(),
  gallery: z.array(imageRef.refine((value) => value !== "", "Image vide.")).max(24).default([]),
  year,
  client: text(160).optional().default(""),
  role: text(160).optional().default(""),
  problem: localizedSchema.optional().default({ fr: "", en: "" }),
  methodology: localizedSchema.optional().default({ fr: "", en: "" }),
  results: localizedSchema.optional().default({ fr: "", en: "" }),
  lessons: localizedSchema.optional().default({ fr: "", en: "" }),
  externalUrl: absoluteUrl.optional().default(""),
});

export const serviceInputSchema = z.object({
  slug: localizedSlugSchema,
  title: requiredLocalizedSchema,
  summary: localizedSchema.optional().default({ fr: "", en: "" }),
  body: localizedSchema.optional().default({ fr: "", en: "" }),
  features: z.array(text(300).min(1)).max(30).default([]),
  deliverables: z.array(text(300).min(1)).max(30).default([]),
  icon: text(80).optional().default(""),
  coverImage: imageRef.optional().default(""),
  order: z.number().int().min(0).max(999).default(0),
  featured: z.boolean().default(false),
  status: contentStatusSchema.default("draft"),
});

export const researchInputSchema = z.object({
  ...editorial,
  summary: localizedSchema.optional().default({ fr: "", en: "" }),
  type: text(100).optional().default(""),
  year,
  institution: text(200).optional().default(""),
  authors: stringList(160, 30),
  externalUrl: absoluteUrl.optional().default(""),
  documentUrl: absoluteUrl.optional().default(""),
});

export const skillInputSchema = z.object({
  name: text(120).min(1, "Le nom est obligatoire."),
  slug: slugSchema,
  category: text(120).min(1, "La catégorie est obligatoire."),
  description: localizedSchema.optional().default({ fr: "", en: "" }),
  order: z.number().int().min(0).max(999).default(0),
  featured: z.boolean().default(false),
  enabled: z.boolean().default(true),
  icon: text(80).optional().default(""),
});

export const socialInputSchema = z.object({
  platform: text(80).min(1, "La plateforme est obligatoire."),
  label: text(100).min(1, "Le libellé est obligatoire."),
  url: absoluteUrl.refine((value) => value !== "", "L'URL est obligatoire."),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).max(999).default(0),
});

/** Création d'un média pointant vers Google Drive ou un CDN externe. */
export const mediaCreateSchema = z.object({
  name: text(160).min(1, "Le nom est obligatoire."),
  filename: text(240).min(1, "Le nom de fichier est obligatoire."),
  provider: z.enum(["google-drive", "external"]),
  providerId: text(160).optional().default(""),
  externalUrl: absoluteUrl.refine((value) => value !== "", "L'URL est obligatoire."),
  mimeType: text(100).optional().default(""),
  width: z.number().int().min(0).max(20_000).optional().default(0),
  height: z.number().int().min(0).max(20_000).optional().default(0),
  alt: localizedSchema.optional().default({ fr: "", en: "" }),
  category: text(100).optional().default(""),
});

/**
 * Modification d'un média — volontairement limitée aux métadonnées.
 *
 * Le fournisseur et le fichier ne sont pas modifiables : un média GridFS
 * échouerait sinon la validation `provider` au moindre enregistrement.
 */
export const mediaUpdateSchema = z.object({
  name: text(160).min(1, "Le nom est obligatoire."),
  alt: localizedSchema.optional().default({ fr: "", en: "" }),
  category: text(100).optional().default(""),
});

export const contactMessageSchema = z.object({
  name: text(100).min(2),
  organisation: text(160).optional().default(""),
  email: z.string().trim().max(254).email(),
  subject: z.enum(["mandat", "emploi", "autre"]),
  message: text(5000).min(10),
  website: z.string().max(0).optional().default(""),
});

/* ------------------------------------------------------------------ */
/* Réglages singleton — un schéma par écran d'administration.          */
/* ------------------------------------------------------------------ */

const emailField = z.string().trim().max(254).refine(
  (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  { message: "Courriel invalide." },
);

export const settingsInputSchema = z.object({
  brandName: text(120).min(1, "Le nom de marque est obligatoire."),
  baseline: localizedSchema.optional().default({ fr: "", en: "" }),
  email: emailField,
  phone: text(80).optional().default(""),
  city: text(100).optional().default(""),
  region: text(100).optional().default(""),
  country: text(100).optional().default(""),
  cvUrl: absoluteUrl.optional().default(""),
  calendlyUrl: absoluteUrl.optional().default(""),
  canonicalUrl: absoluteUrl.optional().default(""),
  heroEyebrow: localizedSchema.optional().default({ fr: "", en: "" }),
  heroTitle: localizedSchema.optional().default({ fr: "", en: "" }),
  heroLead: localizedSchema.optional().default({ fr: "", en: "" }),
  heroImage: imageRef.optional().default(""),
  title: localizedSchema.optional().default({ fr: "", en: "" }),
  description: localizedSchema.optional().default({ fr: "", en: "" }),
  defaultOgImage: imageRef.optional().default(""),
  footerText: localizedSchema.optional().default({ fr: "", en: "" }),
  stats: z
    .array(z.object({ value: text(40), label: localizedSchema }))
    .max(6)
    .default([]),
});

export const profileInputSchema = z.object({
  name: text(160).min(1, "Le nom est obligatoire."),
  professionalTitle: localizedSchema.optional().default({ fr: "", en: "" }),
  headline: localizedSchema.optional().default({ fr: "", en: "" }),
  shortBio: localizedSchema.optional().default({ fr: "", en: "" }),
  longBio: localizedSchema.optional().default({ fr: "", en: "" }),
  email: emailField,
  location: text(160).optional().default(""),
  portrait: imageRef.optional().default(""),
  cvUrl: absoluteUrl.optional().default(""),
  education: z
    .array(z.object({ title: text(200).min(1), detail: text(400).optional().default("") }))
    .max(20)
    .default([]),
  experience: z
    .array(z.object({ title: text(200).min(1), detail: text(400).optional().default("") }))
    .max(20)
    .default([]),
  certifications: z.array(text(200).min(1)).max(30).default([]),
});

/** Bloc « titre / texte / image », réutilisé par les pages éditoriales. */
const sectionBlock = z.object({
  title: localizedSchema,
  body: localizedSchema,
  image: imageRef.optional().default(""),
});

/** Entrée de frise chronologique : période, intitulé, détail, illustration. */
const timelineBlock = z.object({
  period: text(40).optional().default(""),
  title: requiredLocalizedSchema,
  detail: localizedSchema.optional().default({ fr: "", en: "" }),
  image: imageRef.optional().default(""),
});

/** Élément de liste illustrée : valeur, initiative, projet mis en avant. */
const itemBlock = z.object({
  title: requiredLocalizedSchema,
  detail: localizedSchema.optional().default({ fr: "", en: "" }),
  image: imageRef.optional().default(""),
  url: absoluteUrl.optional().default(""),
});

/** Ligne de parcours : poste ou diplôme, organisation, période, détail. */
const entryBlock = z.object({
  title: requiredLocalizedSchema,
  organisation: text(200).optional().default(""),
  period: text(60).optional().default(""),
  detail: localizedSchema.optional().default({ fr: "", en: "" }),
});

const pageBase = {
  title: requiredLocalizedSchema,
  subtitle: localizedSchema.optional().default({ fr: "", en: "" }),
  body: localizedSchema.optional().default({ fr: "", en: "" }),
  heroImage: imageRef.optional().default(""),
};

export const aboutPageSchema = z.object({
  ...pageBase,
  timeline: z.array(timelineBlock).max(20).default([]),
  sections: z.array(sectionBlock).max(12).default([]),
  media: z.array(imageRef.refine((value) => value !== "", "Image vide.")).max(12).default([]),
});

export const datakleePageSchema = z.object({
  ...pageBase,
  /** Mission et vision : deux textes longs, distincts du corps de page. */
  mission: localizedSchema.optional().default({ fr: "", en: "" }),
  vision: localizedSchema.optional().default({ fr: "", en: "" }),
  /** Valeurs de la structure. */
  items: z.array(itemBlock).max(12).default([]),
  /** Le fondateur et l'ancrage haïtien, en sections illustrées. */
  sections: z.array(sectionBlock).max(12).default([]),
  ctaLabel: localizedSchema.optional().default({ fr: "", en: "" }),
  ctaHref: text(240).optional().default(""),
});

export const engagementPageSchema = z.object({
  ...pageBase,
  /** Initiatives concrètes. */
  items: z.array(itemBlock).max(16).default([]),
  /** Valeurs portées par l'engagement. */
  sections: z.array(sectionBlock).max(12).default([]),
  media: z.array(imageRef.refine((value) => value !== "", "Image vide.")).max(12).default([]),
});

export const cvPageSchema = z.object({
  ...pageBase,
  /** Expériences professionnelles puis études, dans deux listes séparées. */
  entries: z.array(entryBlock).max(30).default([]),
  timeline: z.array(timelineBlock).max(30).default([]),
  certifications: z
    .array(
      z.object({
        name: text(200).min(1),
        issuer: text(200).optional().default(""),
        year: text(10).optional().default(""),
      }),
    )
    .max(30)
    .default([]),
  items: z.array(itemBlock).max(20).default([]),
  documentUrl: absoluteUrl.optional().default(""),
});

/** Une bande de l'accueil : ordre, visibilité et textes d'en-tête. */
export const homeSectionInputSchema = z.object({
  key: slugSchema,
  order: z.number().int().min(0).max(99).default(0),
  visible: z.boolean().default(true),
  eyebrow: localizedSchema.optional().default({ fr: "", en: "" }),
  title: localizedSchema.optional().default({ fr: "", en: "" }),
  lead: localizedSchema.optional().default({ fr: "", en: "" }),
  image: imageRef.optional().default(""),
});
