"use client";

import { useState } from "react";

import { FormShell, FormSection, DeleteButton } from "@/components/admin/forms/FormShell";
import { PlainSlugField } from "@/components/admin/forms/SlugField";
import {
  LocalizedField,
  NumberField,
  SwitchField,
  TextField,
  errorFor,
} from "@/components/admin/forms/fields";
import { useResourceForm } from "@/components/admin/forms/useResourceForm";
import {
  readBoolean,
  readLocalized,
  readNumber,
  readString,
  type AdminDoc,
  type Localized,
} from "@/components/admin/forms/types";
import { slugify } from "@/lib/utils";

type SkillValue = {
  name: string;
  slug: string;
  category: string;
  description: Localized;
  order: number | null;
  enabled: boolean;
  featured: boolean;
  icon: string;
};

function read(doc: AdminDoc | undefined): SkillValue {
  const source = doc ?? {};
  return {
    name: readString(source.name),
    slug: readString(source.slug),
    category: readString(source.category),
    description: readLocalized(source.description),
    order: readNumber(source.order) ?? 0,
    enabled: readBoolean(source.enabled, true),
    featured: readBoolean(source.featured),
    icon: readString(source.icon),
  };
}

/**
 * Formulaire de compétence.
 *
 * Ses champs lui appartiennent : `name`, `category`, `order`, `enabled` et
 * `icon` ne sont plus les champs « titre », « année » ou « auteur » d'un
 * éditeur générique détournés au passage.
 */
export function SkillForm({ id, initial }: { id?: string; initial?: AdminDoc }) {
  const [autoSlug, setAutoSlug] = useState(() => !initial);
  const form = useResourceForm<SkillValue>({
    initial: read(initial),
    target: id
      ? { url: `/api/admin/content/skills/${id}`, method: "PATCH" }
      : { url: "/api/admin/skills", method: "POST", redirectTo: "/admin/skills" },
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
      removal={
        id ? (
          <DeleteButton
            resource="skills"
            id={id}
            section="skills"
            description="Cette compétence sera retirée de la base. Pour la masquer temporairement, désactivez-la plutôt."
          />
        ) : undefined
      }
    >
      <FormSection title="Compétence" columns={2}>
        <TextField
          label="Nom"
          required
          value={value.name}
          error={errorFor(errors, "name")}
          onChange={(name) => patch({ name, ...(autoSlug ? { slug: slugify(name) } : {}) })}
          hint="Nom de l’outil ou de la discipline, non traduit."
        />
        <PlainSlugField
          value={value.slug}
          onChange={(slug) => patch({ slug })}
          auto={autoSlug}
          onAutoChange={setAutoSlug}
          source={value.name}
          error={errorFor(errors, "slug")}
          hint="Identifiant technique, utilisé pour l’ancre de la catégorie."
        />
        <TextField
          label="Catégorie"
          required
          value={value.category}
          error={errorFor(errors, "category")}
          onChange={(category) => patch({ category })}
          hint="Les compétences sont regroupées par catégorie sur la page publique."
        />
        <TextField
          label="Icône"
          value={value.icon}
          error={errorFor(errors, "icon")}
          onChange={(icon) => patch({ icon })}
          hint="Nom d’icône Lucide, facultatif."
        />
        <LocalizedField
          label="Description"
          multiline
          rows={3}
          value={value.description}
          errorFr={errorFor(errors, "description.fr")}
          onChange={(description) => patch({ description })}
          className="sm:col-span-2"
        />
      </FormSection>

      <FormSection title="Affichage" columns={2}>
        <NumberField
          label="Ordre dans la catégorie"
          value={value.order}
          min={0}
          max={999}
          error={errorFor(errors, "order")}
          onChange={(order) => patch({ order })}
        />
        <div className="grid gap-2">
          <SwitchField
            label="Active"
            checked={value.enabled}
            onChange={(enabled) => patch({ enabled })}
            hint="Décochée, la compétence disparaît de la page publique sans être supprimée."
          />
          <SwitchField
            label="Mettre en avant"
            checked={value.featured}
            onChange={(featured) => patch({ featured })}
          />
        </div>
      </FormSection>
    </FormShell>
  );
}
