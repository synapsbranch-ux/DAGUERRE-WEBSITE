"use client";

import { FormShell, FormSection } from "@/components/admin/forms/FormShell";
import { ImageField } from "@/components/admin/forms/ImageField";
import { LocalizedField, MarkdownField, TextField, errorFor } from "@/components/admin/forms/fields";
import { useResourceForm } from "@/components/admin/forms/useResourceForm";
import { useSingletonDoc } from "@/components/admin/forms/useSingletonForm";
import { SingletonShell } from "@/components/admin/forms/SingletonShell";
import {
  CertificationsRepeater,
  EntriesRepeater,
  ItemsRepeater,
  TimelineRepeater,
  readCertifications,
  readEntries,
  readItems,
  readTimeline,
  type CertificationBlock,
  type EntryBlock,
  type ItemBlock,
  type TimelineBlock,
} from "@/components/admin/forms/pageBlocks";
import { readLocalized, readString, type AdminDoc, type Localized } from "@/components/admin/forms/types";

type CvValue = {
  title: Localized;
  subtitle: Localized;
  body: Localized;
  heroImage: string;
  entries: EntryBlock[];
  timeline: TimelineBlock[];
  certifications: CertificationBlock[];
  items: ItemBlock[];
  documentUrl: string;
};

function read(doc: AdminDoc): CvValue {
  return {
    title: readLocalized(doc.title),
    subtitle: readLocalized(doc.subtitle),
    body: readLocalized(doc.body),
    heroImage: readString(doc.heroImage),
    entries: readEntries(doc.entries),
    timeline: readTimeline(doc.timeline),
    certifications: readCertifications(doc.certifications),
    items: readItems(doc.items),
    documentUrl: readString(doc.documentUrl),
  };
}

/** Page CV : résumé, expériences, études, certifications, projets et document. */
export function CvPageForm() {
  const { doc, state } = useSingletonDoc("cv");
  if (state !== "ready" || !doc) return <SingletonShell state={state} />;
  return <CvFields initial={read(doc)} />;
}

function CvFields({ initial }: { initial: CvValue }) {
  const form = useResourceForm<CvValue>({
    initial,
    target: { url: "/api/admin/settings/cv", method: "PUT" },
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
          rows={2}
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

      <FormSection title="Résumé">
        <MarkdownField
          label="Résumé de carrière"
          value={value.body}
          error={errorFor(errors, "body.fr")}
          onChange={(body) => patch({ body })}
        />
      </FormSection>

      <FormSection title="Expériences professionnelles">
        <EntriesRepeater
          label="Expériences"
          titleLabel="Poste"
          addLabel="Ajouter une expérience"
          hint="De la plus récente à la plus ancienne."
          items={value.entries}
          onChange={(entries) => patch({ entries })}
        />
      </FormSection>

      <FormSection title="Études">
        <TimelineRepeater
          label="Formation"
          periodLabel="Année"
          addLabel="Ajouter un diplôme"
          items={value.timeline}
          onChange={(timeline) => patch({ timeline })}
        />
      </FormSection>

      <FormSection title="Certifications">
        <CertificationsRepeater items={value.certifications} onChange={(certifications) => patch({ certifications })} />
      </FormSection>

      <FormSection title="Projets">
        <ItemsRepeater
          label="Projets marquants"
          hint="Réalisations à mettre en avant sur le CV, avec un lien lorsque c’est possible."
          addLabel="Ajouter un projet"
          items={value.items}
          onChange={(items) => patch({ items })}
        />
      </FormSection>

      <FormSection title="Document">
        <TextField
          label="CV en PDF"
          type="url"
          value={value.documentUrl}
          error={errorFor(errors, "documentUrl")}
          onChange={(documentUrl) => patch({ documentUrl })}
          hint="URL absolue du fichier. Vide, le bouton de téléchargement n’apparaît pas."
        />
      </FormSection>
    </FormShell>
  );
}
