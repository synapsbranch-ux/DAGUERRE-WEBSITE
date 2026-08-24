"use client";

import { useState } from "react";

import { FormShell, FormSection, ArchiveButton } from "@/components/admin/forms/FormShell";
import { SlugField } from "@/components/admin/forms/SlugField";
import { ImageField } from "@/components/admin/forms/ImageField";
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

type ResearchValue = {
  title: Localized;
  slug: Localized;
  summary: Localized;
  excerpt: Localized;
  body: Localized;
  type: string;
  year: number | null;
  institution: string;
  authors: string[];
  tags: string[];
  categories: string[];
  documentUrl: string;
  externalUrl: string;
  coverImage: string;
  status: ContentStatus;
  featured: boolean;
  publishedAt: string;
  seoTitle: Localized;
  seoDescription: Localized;
  ogImage: string;
};

/** Natures de travaux couramment publiées ; le champ reste libre. */
const researchTypes = [
  "Mémoire",
  "Publication",
  "Étude",
  "Rapport",
  "Communication",
  "Méthodologie",
];

function read(doc: AdminDoc | undefined): ResearchValue {
  const source = doc ?? {};
  return {
    title: readLocalized(source.title),
    slug: readLocalized(source.slug),
    summary: readLocalized(source.summary),
    excerpt: readLocalized(source.excerpt),
    body: readLocalized(source.body),
    type: readString(source.type),
    year: readNumber(source.year),
    institution: readString(source.institution),
    authors: readList(source.authors),
    tags: readList(source.tags),
    categories: readList(source.categories),
    documentUrl: readString(source.documentUrl),
    externalUrl: readString(source.externalUrl),
    coverImage: readString(source.coverImage),
    status: readStatus(source.status),
    featured: readBoolean(source.featured),
    publishedAt: readDateTimeLocal(source.publishedAt),
    seoTitle: readLocalized(source.seoTitle),
    seoDescription: readLocalized(source.seoDescription),
    ogImage: readString(source.ogImage),
  };
}

/** Formulaire d'un travail de recherche. */
export function ResearchForm({ id, initial }: { id?: string; initial?: AdminDoc }) {
  const [autoSlug, setAutoSlug] = useState(() => !initial);
  const form = useResourceForm<ResearchValue>({
    initial: read(initial),
    target: id
      ? { url: `/api/admin/content/research/${id}`, method: "PATCH" }
      : { url: "/api/admin/research", method: "POST", redirectTo: "/admin/research" },
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
      removal={id ? <ArchiveButton resource="research" id={id} section="research" /> : undefined}
    >
      <FormSection title="Travail de recherche">
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
          label="Résumé"
          multiline
          rows={4}
          value={value.summary}
          errorFr={errorFor(errors, "summary.fr")}
          onChange={(summary) => patch({ summary })}
        />
        <MarkdownField
          label="Contenu"
          value={value.body}
          error={errorFor(errors, "body.fr")}
          onChange={(body) => patch({ body })}
        />
      </FormSection>

      <FormSection title="Références" columns={2}>
        <TextField
          label="Type de travail"
          value={value.type}
          error={errorFor(errors, "type")}
          onChange={(type) => patch({ type })}
          hint={`Ex. ${researchTypes.join(", ")}.`}
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
          label="Institution"
          value={value.institution}
          error={errorFor(errors, "institution")}
          onChange={(institution) => patch({ institution })}
        />
        <ListField
          label="Auteurs"
          values={value.authors}
          error={errorFor(errors, "authors")}
          onChange={(authors) => patch({ authors })}
        />
        <ListField
          label="Tags"
          values={value.tags}
          error={errorFor(errors, "tags")}
          onChange={(tags) => patch({ tags })}
        />
        <ListField
          label="Catégories"
          values={value.categories}
          error={errorFor(errors, "categories")}
          onChange={(categories) => patch({ categories })}
        />
        <TextField
          label="Document (PDF)"
          type="url"
          value={value.documentUrl}
          error={errorFor(errors, "documentUrl")}
          onChange={(documentUrl) => patch({ documentUrl })}
          hint="URL absolue du document téléchargeable."
        />
        <TextField
          label="Lien externe"
          type="url"
          value={value.externalUrl}
          error={errorFor(errors, "externalUrl")}
          onChange={(externalUrl) => patch({ externalUrl })}
          hint="Revue, dépôt institutionnel ou page de la publication."
        />
      </FormSection>

      <FormSection title="Image">
        <ImageField
          label="Image de couverture"
          value={value.coverImage}
          error={errorFor(errors, "coverImage")}
          onChange={(coverImage) => patch({ coverImage })}
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
        />
        <SwitchField
          label="Mettre en avant"
          checked={value.featured}
          onChange={(featured) => patch({ featured })}
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
