"use client";

import { useState } from "react";

import { FormShell, FormSection, ArchiveButton } from "@/components/admin/forms/FormShell";
import { SlugField } from "@/components/admin/forms/SlugField";
import { GalleryField, ImageField } from "@/components/admin/forms/ImageField";
import {
  LocalizedField,
  MarkdownField,
  ListField,
  NumberField,
  SelectField,
  SwitchField,
  TextField,
  errorFor,
} from "@/components/admin/forms/fields";
import { useResourceForm } from "@/components/admin/forms/useResourceForm";
import {
  readBoolean,
  readDateTimeLocal,
  readList,
  readLocalized,
  readNumber,
  readStatus,
  readString,
  statusOptions,
  toIsoDate,
  type AdminDoc,
  type ContentStatus,
  type Localized,
} from "@/components/admin/forms/types";
import { slugify } from "@/lib/utils";

type ProjectValue = {
  title: Localized;
  slug: Localized;
  kicker: Localized;
  excerpt: Localized;
  summary: Localized;
  body: Localized;
  coverImage: string;
  gallery: string[];
  categories: string[];
  tags: string[];
  technologies: string[];
  year: number | null;
  client: string;
  role: string;
  problem: Localized;
  methodology: Localized;
  results: Localized;
  lessons: Localized;
  externalUrl: string;
  status: ContentStatus;
  featured: boolean;
  publishedAt: string;
  seoTitle: Localized;
  seoDescription: Localized;
  ogImage: string;
};

function read(doc: AdminDoc | undefined): ProjectValue {
  const source = doc ?? {};
  return {
    title: readLocalized(source.title),
    slug: readLocalized(source.slug),
    kicker: readLocalized(source.kicker),
    excerpt: readLocalized(source.excerpt),
    summary: readLocalized(source.summary),
    body: readLocalized(source.body),
    coverImage: readString(source.coverImage),
    gallery: readList(source.gallery),
    categories: readList(source.categories),
    tags: readList(source.tags),
    technologies: readList(source.technologies),
    year: readNumber(source.year),
    client: readString(source.client),
    role: readString(source.role),
    problem: readLocalized(source.problem),
    methodology: readLocalized(source.methodology),
    results: readLocalized(source.results),
    lessons: readLocalized(source.lessons),
    externalUrl: readString(source.externalUrl),
    status: readStatus(source.status),
    featured: readBoolean(source.featured),
    publishedAt: readDateTimeLocal(source.publishedAt),
    seoTitle: readLocalized(source.seoTitle),
    seoDescription: readLocalized(source.seoDescription),
    ogImage: readString(source.ogImage),
  };
}

/** Formulaire de réalisation : champs éditoriaux **et** étude de cas. */
export function ProjectForm({ id, initial }: { id?: string; initial?: AdminDoc }) {
  const [autoSlug, setAutoSlug] = useState(() => !initial);
  const form = useResourceForm<ProjectValue>({
    initial: read(initial),
    target: id
      ? { url: `/api/admin/content/projects/${id}`, method: "PATCH" }
      : { url: "/api/admin/projects", method: "POST", redirectTo: "/admin/projets" },
    toPayload: (value) => ({ ...value, publishedAt: toIsoDate(value.publishedAt) }),
  });

  const { value, patch, errors } = form;

  return (
    <FormShell
      onSubmit={form.submit}
      saving={form.saving}
      notice={form.notice}
      formError={form.formError}
      dirty={form.dirty}
      removal={id ? <ArchiveButton resource="projects" id={id} section="projets" /> : undefined}
    >
      <FormSection title="Réalisation">
        <LocalizedField
          label="Titre"
          required
          value={value.title}
          errorFr={errorFor(errors, "title.fr", "title")}
          onChange={(title) =>
            patch({ title, ...(autoSlug ? { slug: { ...value.slug, fr: slugify(title.fr) } } : {}) })
          }
        />
        <SlugField
          value={value.slug}
          onChange={(slug) => patch({ slug })}
          auto={autoSlug}
          onAutoChange={setAutoSlug}
          title={value.title.fr}
          errorFr={errorFor(errors, "slug.fr", "slug")}
          errorEn={errorFor(errors, "slug.en")}
        />
        <LocalizedField
          label="Surtitre"
          value={value.kicker}
          errorFr={errorFor(errors, "kicker.fr")}
          onChange={(kicker) => patch({ kicker })}
          hint="Courte mention au-dessus du titre, ex. « Tableau de bord »."
        />
        <LocalizedField
          label="Extrait"
          multiline
          rows={3}
          value={value.excerpt}
          errorFr={errorFor(errors, "excerpt.fr")}
          onChange={(excerpt) => patch({ excerpt })}
          hint="Texte des cartes de la liste des réalisations."
        />
        <LocalizedField
          label="Résumé"
          multiline
          rows={3}
          value={value.summary}
          errorFr={errorFor(errors, "summary.fr")}
          onChange={(summary) => patch({ summary })}
          hint="Chapeau de la page détaillée. Vide, l’extrait est repris."
        />
        <MarkdownField
          label="Contenu"
          value={value.body}
          error={errorFor(errors, "body.fr")}
          onChange={(body) => patch({ body })}
        />
      </FormSection>

      <FormSection title="Étude de cas" description="Ces quatre blocs structurent la page détaillée.">
        <LocalizedField
          label="Problème"
          multiline
          value={value.problem}
          errorFr={errorFor(errors, "problem.fr")}
          onChange={(problem) => patch({ problem })}
        />
        <LocalizedField
          label="Méthodologie"
          multiline
          value={value.methodology}
          errorFr={errorFor(errors, "methodology.fr")}
          onChange={(methodology) => patch({ methodology })}
        />
        <LocalizedField
          label="Résultats"
          multiline
          value={value.results}
          errorFr={errorFor(errors, "results.fr")}
          onChange={(results) => patch({ results })}
        />
        <LocalizedField
          label="Leçons apprises"
          multiline
          value={value.lessons}
          errorFr={errorFor(errors, "lessons.fr")}
          onChange={(lessons) => patch({ lessons })}
        />
      </FormSection>

      <FormSection title="Contexte" columns={2}>
        <TextField
          label="Client"
          value={value.client}
          error={errorFor(errors, "client")}
          onChange={(client) => patch({ client })}
        />
        <TextField
          label="Rôle"
          value={value.role}
          error={errorFor(errors, "role")}
          onChange={(role) => patch({ role })}
        />
        <NumberField
          label="Année"
          value={value.year}
          min={1900}
          max={2100}
          error={errorFor(errors, "year")}
          onChange={(year) => patch({ year })}
        />
        <TextField
          label="Lien externe"
          type="url"
          value={value.externalUrl}
          error={errorFor(errors, "externalUrl")}
          onChange={(externalUrl) => patch({ externalUrl })}
          hint="Démo, dépôt ou publication associée."
        />
        <ListField
          label="Technologies"
          values={value.technologies}
          error={errorFor(errors, "technologies")}
          onChange={(technologies) => patch({ technologies })}
        />
        <ListField
          label="Catégories"
          values={value.categories}
          error={errorFor(errors, "categories")}
          onChange={(categories) => patch({ categories })}
        />
        <ListField
          label="Tags"
          values={value.tags}
          error={errorFor(errors, "tags")}
          onChange={(tags) => patch({ tags })}
        />
      </FormSection>

      <FormSection title="Images">
        <ImageField
          label="Image de couverture"
          value={value.coverImage}
          error={errorFor(errors, "coverImage")}
          onChange={(coverImage) => patch({ coverImage })}
        />
        <GalleryField
          label="Galerie"
          values={value.gallery}
          error={errorFor(errors, "gallery")}
          onChange={(gallery) => patch({ gallery })}
          hint="Images de la page détaillée, dans l’ordre d’affichage."
        />
      </FormSection>

      <FormSection title="Publication" columns={2}>
        <SelectField
          label="Statut"
          value={value.status}
          options={statusOptions}
          error={errorFor(errors, "status")}
          onChange={(status) => patch({ status })}
        />
        <TextField
          label="Date de publication"
          type="datetime-local"
          value={value.publishedAt}
          error={errorFor(errors, "publishedAt")}
          onChange={(publishedAt) => patch({ publishedAt })}
          hint="Une date future planifie la parution."
        />
        <SwitchField
          label="Mettre en avant"
          checked={value.featured}
          onChange={(featured) => patch({ featured })}
          hint="Affiché sur l’accueil et en tête des réalisations."
        />
      </FormSection>

      <FormSection title="Référencement">
        <LocalizedField
          label="Titre SEO"
          value={value.seoTitle}
          errorFr={errorFor(errors, "seoTitle.fr")}
          onChange={(seoTitle) => patch({ seoTitle })}
        />
        <LocalizedField
          label="Description SEO"
          multiline
          rows={3}
          value={value.seoDescription}
          errorFr={errorFor(errors, "seoDescription.fr")}
          onChange={(seoDescription) => patch({ seoDescription })}
        />
        <ImageField
          label="Image Open Graph"
          value={value.ogImage}
          error={errorFor(errors, "ogImage")}
          onChange={(ogImage) => patch({ ogImage })}
        />
      </FormSection>
    </FormShell>
  );
}
