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

type PostValue = {
  title: Localized;
  slug: Localized;
  excerpt: Localized;
  body: Localized;
  coverImage: string;
  categories: string[];
  tags: string[];
  author: string;
  status: ContentStatus;
  featured: boolean;
  publishedAt: string;
  readingTime: number | null;
  seoTitle: Localized;
  seoDescription: Localized;
  ogImage: string;
};

function read(doc: AdminDoc | undefined): PostValue {
  const source = doc ?? {};
  return {
    title: readLocalized(source.title),
    slug: readLocalized(source.slug),
    excerpt: readLocalized(source.excerpt),
    body: readLocalized(source.body),
    coverImage: readString(source.coverImage),
    categories: readList(source.categories),
    tags: readList(source.tags),
    author: readString(source.author),
    status: readStatus(source.status),
    featured: readBoolean(source.featured),
    publishedAt: readDateTimeLocal(source.publishedAt),
    readingTime: readNumber(source.readingTime),
    seoTitle: readLocalized(source.seoTitle),
    seoDescription: readLocalized(source.seoDescription),
    ogImage: readString(source.ogImage),
  };
}

/** Formulaire d'article de blogue. */
export function PostForm({ id, initial }: { id?: string; initial?: AdminDoc }) {
  const [autoSlug, setAutoSlug] = useState(() => !initial);
  const form = useResourceForm<PostValue>({
    initial: read(initial),
    target: id
      ? { url: `/api/admin/content/posts/${id}`, method: "PATCH" }
      : { url: "/api/admin/posts", method: "POST", redirectTo: "/admin/articles" },
    toPayload: (value) => ({
      ...value,
      readingTime: value.readingTime ?? 0,
      publishedAt: toIsoDate(value.publishedAt),
    }),
  });

  const { value, patch, errors } = form;

  return (
    <FormShell
      onSubmit={form.submit}
      saving={form.saving}
      notice={form.notice}
      formError={form.formError}
      dirty={form.dirty}
      removal={id ? <ArchiveButton resource="posts" id={id} section="articles" /> : undefined}
    >
      <FormSection title="Article" description="Le français est la langue d’édition ; l’anglais est facultatif.">
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
          label="Extrait"
          multiline
          rows={3}
          value={value.excerpt}
          errorFr={errorFor(errors, "excerpt.fr", "excerpt")}
          onChange={(excerpt) => patch({ excerpt })}
          hint="Résumé affiché dans les listes et utilisé comme description par défaut."
        />
        <MarkdownField
          label="Contenu"
          value={value.body}
          error={errorFor(errors, "body.fr", "body")}
          onChange={(body) => patch({ body })}
        />
      </FormSection>

      <FormSection title="Classement et attribution" columns={2}>
        <ListField
          label="Catégories"
          values={value.categories}
          error={errorFor(errors, "categories")}
          onChange={(categories) => patch({ categories })}
          hint="Slugs de catégorie, ex. « analyse-de-donnees »."
        />
        <ListField
          label="Tags"
          values={value.tags}
          error={errorFor(errors, "tags")}
          onChange={(tags) => patch({ tags })}
        />
        <TextField
          label="Auteur"
          value={value.author}
          error={errorFor(errors, "author")}
          onChange={(author) => patch({ author })}
        />
        <NumberField
          label="Temps de lecture (minutes)"
          value={value.readingTime}
          min={0}
          max={600}
          error={errorFor(errors, "readingTime")}
          onChange={(readingTime) => patch({ readingTime })}
        />
      </FormSection>

      <FormSection title="Image">
        <ImageField
          label="Image de couverture"
          value={value.coverImage}
          error={errorFor(errors, "coverImage")}
          onChange={(coverImage) => patch({ coverImage })}
          hint="URL externe ou image de la bibliothèque."
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
          hint="Une date future planifie la parution : l’article reste invisible jusque-là."
        />
        <SwitchField
          label="Mettre en avant"
          checked={value.featured}
          onChange={(featured) => patch({ featured })}
          hint="Affiché sur l’accueil et en tête du blogue."
        />
      </FormSection>

      <FormSection title="Référencement" description="Laissés vides, le titre et l’extrait de l’article sont utilisés.">
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
          hint="Aperçu lors du partage. 1200 × 630 recommandé."
        />
      </FormSection>
    </FormShell>
  );
}
