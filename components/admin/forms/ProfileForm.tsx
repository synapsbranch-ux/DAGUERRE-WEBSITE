"use client";

import { FormShell, FormSection } from "@/components/admin/forms/FormShell";
import { ImageField } from "@/components/admin/forms/ImageField";
import {
  ListField,
  LocalizedField,
  RepeaterField,
  TextField,
  errorFor,
} from "@/components/admin/forms/fields";
import { useResourceForm } from "@/components/admin/forms/useResourceForm";
import { useSingletonDoc } from "@/components/admin/forms/useSingletonForm";
import { SingletonShell } from "@/components/admin/forms/SingletonShell";
import {
  readArray,
  readList,
  readLocalized,
  readString,
  type AdminDoc,
  type Localized,
} from "@/components/admin/forms/types";

type Entry = { title: string; detail: string };

type ProfileValue = {
  name: string;
  professionalTitle: Localized;
  headline: Localized;
  shortBio: Localized;
  longBio: Localized;
  email: string;
  location: string;
  portrait: string;
  cvUrl: string;
  education: Entry[];
  experience: Entry[];
  certifications: string[];
};

const readEntry = (entry: AdminDoc): Entry => ({
  title: readString(entry.title),
  detail: readString(entry.detail),
});

function read(doc: AdminDoc): ProfileValue {
  return {
    name: readString(doc.name),
    professionalTitle: readLocalized(doc.professionalTitle),
    headline: readLocalized(doc.headline),
    shortBio: readLocalized(doc.shortBio),
    longBio: readLocalized(doc.longBio),
    email: readString(doc.email),
    location: readString(doc.location),
    portrait: readString(doc.portrait),
    cvUrl: readString(doc.cvUrl),
    education: readArray(doc.education, readEntry),
    experience: readArray(doc.experience, readEntry),
    certifications: readList(doc.certifications),
  };
}

/** Profil public : identité, biographies, parcours et portrait. */
export function ProfileForm() {
  const { doc, state } = useSingletonDoc("profile");
  if (state !== "ready" || !doc) return <SingletonShell state={state} />;
  return <ProfileFields initial={read(doc)} />;
}

function ProfileFields({ initial }: { initial: ProfileValue }) {
  const form = useResourceForm<ProfileValue>({
    initial,
    target: { url: "/api/admin/settings/profile", method: "PUT" },
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
      <FormSection title="Identité" columns={2}>
        <TextField
          label="Nom"
          required
          value={value.name}
          error={errorFor(errors, "name")}
          onChange={(name) => patch({ name })}
        />
        <TextField
          label="Courriel"
          type="email"
          value={value.email}
          error={errorFor(errors, "email")}
          onChange={(email) => patch({ email })}
        />
        <TextField
          label="Localisation"
          value={value.location}
          error={errorFor(errors, "location")}
          onChange={(location) => patch({ location })}
          hint="Ex. « Québec, Canada »."
        />
        <TextField
          label="CV téléchargeable"
          type="url"
          value={value.cvUrl}
          error={errorFor(errors, "cvUrl")}
          onChange={(cvUrl) => patch({ cvUrl })}
        />
        <LocalizedField
          label="Titre professionnel"
          value={value.professionalTitle}
          errorFr={errorFor(errors, "professionalTitle.fr")}
          onChange={(professionalTitle) => patch({ professionalTitle })}
          className="sm:col-span-2"
        />
      </FormSection>

      <FormSection title="Biographie">
        <LocalizedField
          label="Accroche"
          multiline
          rows={2}
          value={value.headline}
          errorFr={errorFor(errors, "headline.fr")}
          onChange={(headline) => patch({ headline })}
          hint="Une phrase, affichée en tête des pages de présentation."
        />
        <LocalizedField
          label="Bio courte"
          multiline
          rows={4}
          value={value.shortBio}
          errorFr={errorFor(errors, "shortBio.fr")}
          onChange={(shortBio) => patch({ shortBio })}
        />
        <LocalizedField
          label="Bio longue"
          multiline
          rows={10}
          value={value.longBio}
          errorFr={errorFor(errors, "longBio.fr")}
          onChange={(longBio) => patch({ longBio })}
        />
      </FormSection>

      <FormSection title="Portrait">
        <ImageField
          label="Photo de portrait"
          value={value.portrait}
          error={errorFor(errors, "portrait")}
          onChange={(portrait) => patch({ portrait })}
          hint="Format vertical recommandé — utilisée dans le hero et sur « À propos »."
        />
      </FormSection>

      <FormSection title="Parcours">
        <RepeaterField<Entry>
          label="Formation"
          items={value.education}
          onChange={(education) => patch({ education })}
          create={() => ({ title: "", detail: "" })}
          itemLabel={(entry, index) => entry.title || `Formation ${index + 1}`}
          addLabel="Ajouter une formation"
          renderItem={(entry, update) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Intitulé" value={entry.title} onChange={(title) => update({ title })} />
              <TextField
                label="Détail"
                value={entry.detail}
                onChange={(detail) => update({ detail })}
                hint="Établissement, année."
              />
            </div>
          )}
        />
        <RepeaterField<Entry>
          label="Expérience"
          items={value.experience}
          onChange={(experience) => patch({ experience })}
          create={() => ({ title: "", detail: "" })}
          itemLabel={(entry, index) => entry.title || `Expérience ${index + 1}`}
          addLabel="Ajouter une expérience"
          renderItem={(entry, update) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Poste" value={entry.title} onChange={(title) => update({ title })} />
              <TextField
                label="Détail"
                value={entry.detail}
                onChange={(detail) => update({ detail })}
                hint="Organisation, période."
              />
            </div>
          )}
        />
        <ListField
          label="Certifications"
          values={value.certifications}
          error={errorFor(errors, "certifications")}
          onChange={(certifications) => patch({ certifications })}
        />
      </FormSection>
    </FormShell>
  );
}
