"use client";

import { FormShell, FormSection } from "@/components/admin/forms/FormShell";
import { GalleryField, ImageField } from "@/components/admin/forms/ImageField";
import { LocalizedField, MarkdownField, errorFor } from "@/components/admin/forms/fields";
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
import { readList, readLocalized, readString, type AdminDoc, type Localized } from "@/components/admin/forms/types";

type EngagementValue = {
  title: Localized;
  subtitle: Localized;
  body: Localized;
  heroImage: string;
  items: ItemBlock[];
  sections: SectionBlock[];
  media: string[];
};

function read(doc: AdminDoc): EngagementValue {
  return {
    title: readLocalized(doc.title),
    subtitle: readLocalized(doc.subtitle),
    body: readLocalized(doc.body),
    heroImage: readString(doc.heroImage),
    items: readItems(doc.items),
    sections: readSections(doc.sections),
    media: readList(doc.media),
  };
}

/** Page Engagement : contenu, initiatives, valeurs et médias. */
export function EngagementPageForm() {
  const { doc, state } = useSingletonDoc("engagement");
  if (state !== "ready" || !doc) return <SingletonShell state={state} />;
  return <EngagementFields initial={read(doc)} />;
}

function EngagementFields({ initial }: { initial: EngagementValue }) {
  const form = useResourceForm<EngagementValue>({
    initial,
    target: { url: "/api/admin/settings/engagement", method: "PUT" },
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

      <FormSection title="Contenu">
        <MarkdownField
          label="Texte de la page"
          value={value.body}
          error={errorFor(errors, "body.fr")}
          onChange={(body) => patch({ body })}
        />
      </FormSection>

      <FormSection title="Initiatives">
        <ItemsRepeater
          label="Initiatives"
          hint="Actions concrètes, avec lien vers l’organisation ou le projet lorsque c’est pertinent."
          addLabel="Ajouter une initiative"
          items={value.items}
          onChange={(items) => patch({ items })}
        />
      </FormSection>

      <FormSection title="Valeurs">
        <SectionsRepeater
          label="Valeurs"
          hint="Les convictions qui portent cet engagement."
          addLabel="Ajouter une valeur"
          items={value.sections}
          onChange={(sections) => patch({ sections })}
        />
      </FormSection>

      <FormSection title="Médias">
        <GalleryField
          label="Images"
          values={value.media}
          error={errorFor(errors, "media")}
          onChange={(media) => patch({ media })}
        />
      </FormSection>
    </FormShell>
  );
}
