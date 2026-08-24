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
  readList,
  readLocalized,
  readNumber,
  readStatus,
  readString,
  statusOptions,
  type AdminDoc,
  type ContentStatus,
  type Localized,
} from "@/components/admin/forms/types";
import { slugify } from "@/lib/utils";

type ServiceValue = {
  title: Localized;
  slug: Localized;
  summary: Localized;
  body: Localized;
  features: string[];
  deliverables: string[];
  icon: string;
  coverImage: string;
  order: number | null;
  featured: boolean;
  status: ContentStatus;
};

function read(doc: AdminDoc | undefined): ServiceValue {
  const source = doc ?? {};
  return {
    title: readLocalized(source.title),
    slug: readLocalized(source.slug),
    summary: readLocalized(source.summary),
    body: readLocalized(source.body),
    features: readList(source.features),
    deliverables: readList(source.deliverables),
    icon: readString(source.icon),
    coverImage: readString(source.coverImage),
    order: readNumber(source.order) ?? 0,
    featured: readBoolean(source.featured),
    status: readStatus(source.status),
  };
}

/** Formulaire de service Datakle. */
export function ServiceForm({ id, initial }: { id?: string; initial?: AdminDoc }) {
  const [autoSlug, setAutoSlug] = useState(() => !initial);
  const form = useResourceForm<ServiceValue>({
    initial: read(initial),
    target: id
      ? { url: `/api/admin/content/services/${id}`, method: "PATCH" }
      : { url: "/api/admin/services", method: "POST", redirectTo: "/admin/services" },
    toPayload: (value) => ({ ...value, order: value.order ?? 0 }),
  });

  const { value, patch, errors } = form;

  return (
    <FormShell
      onSubmit={form.submit}
      saving={form.saving}
      notice={form.notice}
      formError={form.formError}
      dirty={form.dirty}
      removal={id ? <ArchiveButton resource="services" id={id} section="services" /> : undefined}
    >
      <FormSection title="Service">
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
          rows={3}
          value={value.summary}
          errorFr={errorFor(errors, "summary.fr")}
          onChange={(summary) => patch({ summary })}
          hint="Phrase affichée dans le catalogue des services."
        />
        <MarkdownField
          label="Contenu"
          value={value.body}
          error={errorFor(errors, "body.fr")}
          onChange={(body) => patch({ body })}
        />
      </FormSection>

      <FormSection title="Offre" columns={2}>
        <ListField
          label="Fonctionnalités"
          values={value.features}
          error={errorFor(errors, "features")}
          onChange={(features) => patch({ features })}
          hint="Ce que le service comprend."
        />
        <ListField
          label="Livrables"
          values={value.deliverables}
          error={errorFor(errors, "deliverables")}
          onChange={(deliverables) => patch({ deliverables })}
          hint="Ce que le client reçoit concrètement."
        />
      </FormSection>

      <FormSection title="Présentation" columns={2}>
        <TextField
          label="Icône"
          value={value.icon}
          error={errorFor(errors, "icon")}
          onChange={(icon) => patch({ icon })}
          hint="Nom d’icône Lucide, ex. « chart-bar »."
        />
        <NumberField
          label="Ordre d’affichage"
          value={value.order}
          min={0}
          max={999}
          error={errorFor(errors, "order")}
          onChange={(order) => patch({ order })}
          hint="Le plus petit nombre apparaît en premier."
        />
        <ImageField
          label="Image"
          value={value.coverImage}
          error={errorFor(errors, "coverImage")}
          onChange={(coverImage) => patch({ coverImage })}
          className="sm:col-span-2"
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
        <SwitchField
          label="Mettre en avant"
          checked={value.featured}
          onChange={(featured) => patch({ featured })}
          hint="Signale le service comme prioritaire dans le catalogue."
        />
      </FormSection>
    </FormShell>
  );
}
