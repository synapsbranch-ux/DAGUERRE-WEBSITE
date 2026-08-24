"use client";

import { FormShell, FormSection } from "@/components/admin/forms/FormShell";
import { ImageField } from "@/components/admin/forms/ImageField";
import { LocalizedField, MarkdownField, TextField, errorFor } from "@/components/admin/forms/fields";
import { useResourceForm } from "@/components/admin/forms/useResourceForm";
import { useSingletonDoc } from "@/components/admin/forms/useSingletonForm";
import { SingletonShell } from "@/components/admin/forms/SingletonShell";
import {
  ItemsRepeater,
  SectionsRepeater,
  readItems,
  readSections,
  type ItemBlock,
  type SectionBlock,
} from "@/components/admin/forms/pageBlocks";
import { readLocalized, readString, type AdminDoc, type Localized } from "@/components/admin/forms/types";

type DatakleValue = {
  title: Localized;
  subtitle: Localized;
  body: Localized;
  heroImage: string;
  mission: Localized;
  vision: Localized;
  items: ItemBlock[];
  sections: SectionBlock[];
  ctaLabel: Localized;
  ctaHref: string;
};

function read(doc: AdminDoc): DatakleValue {
  return {
    title: readLocalized(doc.title),
    subtitle: readLocalized(doc.subtitle),
    body: readLocalized(doc.body),
    heroImage: readString(doc.heroImage),
    mission: readLocalized(doc.mission),
    vision: readLocalized(doc.vision),
    items: readItems(doc.items),
    sections: readSections(doc.sections),
    ctaLabel: readLocalized(doc.ctaLabel),
    ctaHref: readString(doc.ctaHref),
  };
}

/** Page Datakle : mission, vision, valeurs, fondateur, ancrage haïtien et appel à l’action. */
export function DataklePageForm() {
  const { doc, state } = useSingletonDoc("datakle");
  if (state !== "ready" || !doc) return <SingletonShell state={state} />;
  return <DatakleFields initial={read(doc)} />;
}

function DatakleFields({ initial }: { initial: DatakleValue }) {
  const form = useResourceForm<DatakleValue>({
    initial,
    target: { url: "/api/admin/settings/datakle", method: "PUT" },
    toPayload: (value) => value,
  });

  const { value, patch, errors } = form;

  return (
    <FormShell
      onSubmit={form.submit}
      saving={form.saving}
      notice={form.notice}
      formError={form.formError}
      dirty={form.dirty}
    >
      <FormSection title="En-tête">
        <LocalizedField
          label="Titre"
          required
          value={value.title}
          errorFr={errorFor(errors, "title.fr", "title")}
          onChange={(title) => patch({ title })}
        />
        <LocalizedField
          label="Sous-titre"
          multiline
          rows={3}
          value={value.subtitle}
          errorFr={errorFor(errors, "subtitle.fr")}
          onChange={(subtitle) => patch({ subtitle })}
        />
        <ImageField
          label="Image d’en-tête"
          value={value.heroImage}
          error={errorFor(errors, "heroImage")}
          onChange={(heroImage) => patch({ heroImage })}
        />
      </FormSection>

      <FormSection title="Mission et vision">
        <LocalizedField
          label="Mission"
          multiline
          rows={4}
          value={value.mission}
          errorFr={errorFor(errors, "mission.fr")}
          onChange={(mission) => patch({ mission })}
          hint="Ce que fait Datakle, aujourd’hui."
        />
        <LocalizedField
          label="Vision"
          multiline
          rows={4}
          value={value.vision}
          errorFr={errorFor(errors, "vision.fr")}
          onChange={(vision) => patch({ vision })}
          hint="Ce vers quoi Datakle tend."
        />
      </FormSection>

      <FormSection title="Présentation">
        <MarkdownField
          label="Texte de présentation"
          value={value.body}
          error={errorFor(errors, "body.fr")}
          onChange={(body) => patch({ body })}
        />
      </FormSection>

      <FormSection title="Valeurs">
        <ItemsRepeater
          label="Valeurs"
          hint="Les principes qui guident les accompagnements."
          addLabel="Ajouter une valeur"
          items={value.items}
          onChange={(items) => patch({ items })}
        />
      </FormSection>

      <FormSection title="Fondateur et Haïti">
        <SectionsRepeater
          label="Sections illustrées"
          hint="Une section pour le fondateur, une pour l’ancrage haïtien — ou tout autre bloc utile."
          items={value.sections}
          onChange={(sections) => patch({ sections })}
        />
      </FormSection>

      <FormSection title="Appel à l’action" columns={2}>
        <LocalizedField
          label="Libellé du bouton"
          value={value.ctaLabel}
          errorFr={errorFor(errors, "ctaLabel.fr")}
          onChange={(ctaLabel) => patch({ ctaLabel })}
        />
        <TextField
          label="Destination"
          value={value.ctaHref}
          error={errorFor(errors, "ctaHref")}
          onChange={(ctaHref) => patch({ ctaHref })}
          hint="Chemin interne (ex. /contact) ou URL absolue. Vide, le bouton n’est pas affiché."
        />
      </FormSection>
    </FormShell>
  );
}
