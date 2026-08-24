import { Schema, model, models } from "mongoose";
import { localizedString, schemaOptions, statusField } from "@/lib/db/models/shared";

function define(name: string, schema: Schema) { return models[name] ?? model(name, schema); }
const local = (required = false) => localizedString(required);
const strings = { type: [String], default: [] };

export const SettingModel = define("Setting", new Schema({
  key: { type: String, default: "site", unique: true }, brandName: String, baseline: local(), title: local(), description: local(),
  email: String, phone: String, city: String, region: String, country: String, cvUrl: String, calendlyUrl: String, canonicalUrl: String,
  heroEyebrow: local(), heroTitle: local(), heroLead: local(), heroImage: String, defaultOgImage: String, footerText: local(),
  socials: [{ _id: false, key: String, label: String, href: String }], stats: [{ _id: false, value: String, label: local() }],
}, schemaOptions));

export const ProfileModel = define("Profile", new Schema({
  key: { type: String, default: "profile", unique: true }, name: String, professionalTitle: local(), headline: local(), shortBio: local(), longBio: local(),
  email: String, location: String, portrait: String, cvUrl: String, education: [{ _id: false, title: String, detail: String }],
  experience: [{ _id: false, title: String, detail: String }], certifications: strings,
}, schemaOptions));

/**
 * Pages éditoriales singleton (`about`, `datakle`, `engagement`, `cv`).
 *
 * Le schéma porte le **sur-ensemble** des blocs utilisés par ces quatre pages :
 * chaque écran d'administration n'écrit que les siens, garanti par son schéma
 * Zod dédié (`aboutPageSchema`, `datakleePageSchema`…). Un seul modèle évite
 * quatre collections quasi identiques, sans pour autant laisser un formulaire
 * générique détourner les champs d'une autre page.
 */
export const PageModel = define("Page", new Schema({
  key: { type: String, required: true, unique: true }, title: local(), subtitle: local(), body: local(), heroImage: String,
  mission: local(), vision: local(),
  sections: [{ _id: false, title: local(), body: local(), image: String }],
  timeline: [{ _id: false, period: String, title: local(), detail: local(), image: String }],
  items: [{ _id: false, title: local(), detail: local(), image: String, url: String }],
  entries: [{ _id: false, title: local(), organisation: String, period: String, detail: local() }],
  certifications: [{ _id: false, name: String, issuer: String, year: String }],
  media: strings, documentUrl: String, ctaLabel: local(), ctaHref: String,
}, schemaOptions));

export const ProjectModel = define("Project", new Schema({
  slug: local(true), title: local(true), kicker: local(), summary: local(), body: local(), excerpt: local(),
  categories: strings, tags: strings, technologies: strings, year: Number, client: String, role: String, problem: local(), methodology: local(), results: local(), lessons: local(),
  coverImage: String, gallery: strings, mediaId: { type: Schema.Types.ObjectId, ref: "Media" }, externalUrl: String, link: String,
  seoTitle: local(), seoDescription: local(), ogImage: String, featured: { type: Boolean, default: false, index: true }, publishedAt: Date, status: statusField,
}, schemaOptions));
ProjectModel.schema.index({ "slug.fr": 1 }, { unique: true }); ProjectModel.schema.index({ status: 1, publishedAt: -1 });

export const PostModel = define("Post", new Schema({
  slug: local(true), title: local(true), excerpt: local(), body: local(), categories: strings, tags: strings, author: String,
  coverImage: String, mediaId: { type: Schema.Types.ObjectId, ref: "Media" }, readingTime: Number, seoTitle: local(), seoDescription: local(), ogImage: String,
  featured: { type: Boolean, default: false, index: true }, publishedAt: Date, status: statusField,
}, schemaOptions));
PostModel.schema.index({ "slug.fr": 1 }, { unique: true }); PostModel.schema.index({ status: 1, publishedAt: -1 });

export const ServiceModel = define("Service", new Schema({
  slug: local(true), title: local(true), name: String, summary: local(), body: local(), shortDescription: local(), description: local(),
  deliverables: strings, features: strings, icon: String, coverImage: String, order: { type: Number, default: 0 }, featured: { type: Boolean, default: false }, status: statusField,
}, schemaOptions));
ServiceModel.schema.index({ "slug.fr": 1 }, { unique: true });

export const ResearchModel = define("Research", new Schema({
  slug: local(true), title: local(true), summary: local(), body: local(), excerpt: local(), type: String, year: Number, institution: String, authors: strings,
  externalUrl: String, documentUrl: String, coverImage: String, categories: strings, tags: strings, featured: { type: Boolean, default: false }, publishedAt: Date, status: statusField,
  seoTitle: local(), seoDescription: local(), ogImage: String,
}, schemaOptions));
ResearchModel.schema.index({ "slug.fr": 1 }, { unique: true }); ResearchModel.schema.index({ status: 1, publishedAt: -1 });

export const SkillModel = define("Skill", new Schema({ name: { type: String, required: true }, slug: { type: String, required: true, unique: true }, category: String, description: local(), order: { type: Number, default: 0 }, featured: Boolean, enabled: { type: Boolean, default: true }, icon: String }, schemaOptions));
export const SocialLinkModel = define("SocialLink", new Schema({ platform: String, label: String, url: String, enabled: { type: Boolean, default: true }, order: { type: Number, default: 0 } }, schemaOptions));
export const TaxonomyModel = define("Taxonomy", new Schema({ kind: { type: String, enum: ["category", "tag"], required: true }, slug: String, name: local(true), description: local() }, schemaOptions));
TaxonomyModel.schema.index({ kind: 1, slug: 1 }, { unique: true });
export const MediaModel = define("Media", new Schema({ name: String, filename: { type: String, required: true }, provider: { type: String, enum: ["google-drive", "external", "gridfs"], default: "external" }, providerId: String, gridFsFileId: { type: Schema.Types.ObjectId }, externalUrl: String, mimeType: String, contentType: String, width: Number, height: Number, size: Number, alt: local(), category: String }, schemaOptions));
export const ContactMessageModel = define("ContactMessage", new Schema({ name: { type: String, required: true }, organisation: String, email: { type: String, required: true }, subject: String, message: { type: String, required: true }, status: { type: String, enum: ["new", "read", "replied", "archived"], default: "new", index: true }, read: { type: Boolean, default: false }, userAgent: String }, schemaOptions));

export const homeSectionKeys = ["hero", "data", "expertise", "about", "projects", "datakle", "engagement", "blog", "contact"] as const;
export const HomeSectionModel = define("HomeSection", new Schema({ key: { type: String, unique: true }, order: Number, visible: { type: Boolean, default: true }, eyebrow: local(), title: local(), lead: local(), image: String, options: Schema.Types.Mixed }, schemaOptions));
