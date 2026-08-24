import type { Model } from "mongoose";
import type { ZodType } from "zod";

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
} from "@/lib/db/models";
import {
  aboutPageSchema,
  cvPageSchema,
  datakleePageSchema,
  engagementPageSchema,
  homeSectionInputSchema,
  mediaCreateSchema,
  mediaUpdateSchema,
  postInputSchema,
  profileInputSchema,
  projectInputSchema,
  researchInputSchema,
  serviceInputSchema,
  settingsInputSchema,
  skillInputSchema,
  socialInputSchema,
} from "@/lib/validation";

/**
 * Modèle Mongoose vu comme un sac de champs.
 *
 * Le registre manipule huit collections de formes différentes : les typer
 * précisément ici obligerait à dupliquer chaque schéma en TypeScript sans rien
 * garantir de plus — la validation réelle des écritures est faite par Zod,
 * juste avant l'appel au modèle.
 */
type AnyModel = Model<Record<string, unknown>>;

/**
 * Registre des ressources du tableau de bord.
 *
 * `createSchema` et `updateSchema` sont distincts : les médias, par exemple,
 * ne se créent qu'avec un fournisseur externe, mais se modifient sur leurs
 * seules métadonnées — un média GridFS échouerait sinon la validation.
 *
 * `archivable` distingue les contenus éditoriaux, qui ne sont **jamais**
 * supprimés définitivement, des ressources purement techniques.
 */
type AdminResource = {
  model: AnyModel;
  createSchema: ZodType;
  updateSchema: ZodType;
  /** DELETE bascule en `archived` au lieu de supprimer. */
  archivable: boolean;
  /** Clé de revalidation et libellé de la section admin. */
  section: string;
  label: string;
};

const resource = (
  model: unknown,
  schema: ZodType,
  options: Partial<Pick<AdminResource, "updateSchema" | "archivable">> &
    Pick<AdminResource, "section" | "label">,
): AdminResource => ({
  model: model as AnyModel,
  createSchema: schema,
  updateSchema: options.updateSchema ?? schema,
  archivable: options.archivable ?? false,
  section: options.section,
  label: options.label,
});

export const adminResources = {
  posts: resource(PostModel, postInputSchema, { archivable: true, section: "articles", label: "Articles" }),
  projects: resource(ProjectModel, projectInputSchema, { archivable: true, section: "projets", label: "Projets" }),
  services: resource(ServiceModel, serviceInputSchema, { archivable: true, section: "services", label: "Services" }),
  research: resource(ResearchModel, researchInputSchema, { archivable: true, section: "research", label: "Recherche" }),
  skills: resource(SkillModel, skillInputSchema, { section: "skills", label: "Compétences" }),
  social: resource(SocialLinkModel, socialInputSchema, { section: "social", label: "Réseaux sociaux" }),
  media: resource(MediaModel, mediaCreateSchema, { updateSchema: mediaUpdateSchema, section: "media", label: "Médias" }),
  homeSections: resource(HomeSectionModel, homeSectionInputSchema, { section: "homepage", label: "Sections d’accueil" }),
} satisfies Record<string, AdminResource>;

export type AdminResourceKey = keyof typeof adminResources;

export function isAdminResource(kind: string): kind is AdminResourceKey {
  return Object.hasOwn(adminResources, kind);
}

/** Ressources dont les fiches se créent depuis le CMS (les médias ont leur propre écran). */
export const creatableResources: AdminResourceKey[] = [
  "posts",
  "projects",
  "services",
  "research",
  "skills",
  "social",
];

type SingletonResource = {
  model: AnyModel;
  schema: ZodType;
  key: string;
  label: string;
};

const singleton = (model: unknown, schema: ZodType, key: string, label: string): SingletonResource => ({
  model: model as AnyModel,
  schema,
  key,
  label,
});

/**
 * Réglages uniques. Chaque clé a **son** schéma : `about` ne peut pas écrire
 * les champs de `cv`, et inversement.
 */
export const singletonResources = {
  settings: singleton(SettingModel, settingsInputSchema, "site", "Paramètres"),
  profile: singleton(ProfileModel, profileInputSchema, "profile", "Profil"),
  about: singleton(PageModel, aboutPageSchema, "about", "À propos"),
  datakle: singleton(PageModel, datakleePageSchema, "datakle", "Datakle"),
  engagement: singleton(PageModel, engagementPageSchema, "engagement", "Engagement"),
  cv: singleton(PageModel, cvPageSchema, "cv", "CV"),
} satisfies Record<string, SingletonResource>;

export type SingletonKey = keyof typeof singletonResources;

export function isSingleton(kind: string): kind is SingletonKey {
  return Object.hasOwn(singletonResources, kind);
}
