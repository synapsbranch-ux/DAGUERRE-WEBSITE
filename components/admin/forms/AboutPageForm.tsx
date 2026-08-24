"use client";

import { FormShell, FormSection } from "@/components/admin/forms/FormShell";
import { GalleryField, ImageField } from "@/components/admin/forms/ImageField";
import { LocalizedField, MarkdownField, errorFor } from "@/components/admin/forms/fields";
import { useResourceForm } from "@/components/admin/forms/useResourceForm";
import { useSingletonDoc } from "@/components/admin/forms/useSingletonForm";
import { SingletonShell } from "@/components/admin/forms/SingletonShell";
import {
  SectionsRepeater,
  TimelineRepeater,
  readSections,
  readTimeline,
  type SectionBlock,
  type TimelineBlock,
} from "@/components/admin/forms/pageBlocks";
import {
  readList,
  readLocalized,
  readString,
  type AdminDoc,
  type Localized,
} from "@/components/admin/forms/types";

type AboutValue = {
  title: Localized;
  subtitle: Localized;
  body: Localized;
  heroImage: string;
  timeline: TimelineBlock[];
  sections: SectionBlock[];
  media: string[];
};

function read(doc: AdminDoc): AboutValue {
  return {
    title: readLocalized(doc.title),
    subtitle: readLocalized(doc.subtitle),
    body: readLocalized(doc.body),
    heroImage: readString(doc.heroImage),
    timeline: readTimeline(doc.timeline),
    sections: readSections(doc.sections),
    media: readList(doc.media),
  };
}

/** Page « À propos » : récit, frise chronologique, sections et images. */
export function AboutPageForm() {
  const { doc, state } = useSingletonDoc("about");
  if (state !== "ready" || !doc) return <SingletonShell state={state} />;
  return <AboutFields initial={read(doc)} />;
}

function AboutFields({ initial }: { initial: AboutValue }) {
  const form = useResourceForm<AboutValue>({
    initial,
    target: { url: "/api/admin/settings/about", method: "PUT" },
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

      <FormSection title="Récit" description="Le texte long de la page, en Markdown.">
        <MarkdownField
          label="Récit"
          value={value.body}
          error={errorFor(errors, "body.fr")}
          onChange={(body) => patch({ body })}
        />
      </FormSection>

      <FormSection title="Parcours">
        <TimelineRepeater
          label="Frise chronologique"
          hint="Les étapes du parcours, dans l’ordre d’affichage."
          items={value.timeline}
          onChange={(timeline) => patch({ timeline })}
        />
      </FormSection>

      <FormSection title="Sections complémentaires">
        <SectionsRepeater
          label="Sections"
          hint="Blocs illustrés affichés sous le récit."
          items={value.sections}
          onChange={(sections) => patch({ sections })}
        />
      </FormSection>

      <FormSection title="Images">
        <GalleryField
          label="Galerie"
          values={value.media}
          error={errorFor(errors, "media")}
          onChange={(media) => patch({ media })}
          hint="Images additionnelles présentées en fin de page."
        />
      </FormSection>
    </FormShell>
  );
}
