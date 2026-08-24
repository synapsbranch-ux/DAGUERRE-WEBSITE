"use client";

import { ImageField } from "@/components/admin/forms/ImageField";
import { LocalizedField, RepeaterField, TextField } from "@/components/admin/forms/fields";
import {
  emptyLocalized,
  readArray,
  readLocalized,
  readString,
  type AdminDoc,
  type Localized,
} from "@/components/admin/forms/types";

/**
 * Blocs structurés partagés par les pages éditoriales.
 *
 * Une frise, une liste d'initiatives et un parcours ont la même mécanique
 * d'édition ; seuls leurs libellés changent. Ces composants la factorisent sans
 * jamais laisser une page écrire les champs d'une autre — c'est le schéma Zod
 * de chaque page qui fixe la liste exacte des blocs autorisés.
 */

export type SectionBlock = { title: Localized; body: Localized; image: string };
export type TimelineBlock = { period: string; title: Localized; detail: Localized; image: string };
export type ItemBlock = { title: Localized; detail: Localized; image: string; url: string };
export type EntryBlock = { title: Localized; organisation: string; period: string; detail: Localized };
export type CertificationBlock = { name: string; issuer: string; year: string };

export const newSection = (): SectionBlock => ({ title: emptyLocalized(), body: emptyLocalized(), image: "" });
export const newTimeline = (): TimelineBlock => ({ period: "", title: emptyLocalized(), detail: emptyLocalized(), image: "" });
export const newItem = (): ItemBlock => ({ title: emptyLocalized(), detail: emptyLocalized(), image: "", url: "" });
export const newEntry = (): EntryBlock => ({ title: emptyLocalized(), organisation: "", period: "", detail: emptyLocalized() });
export const newCertification = (): CertificationBlock => ({ name: "", issuer: "", year: "" });

export const readSections = (value: unknown): SectionBlock[] =>
  readArray(value, (entry: AdminDoc) => ({
    title: readLocalized(entry.title),
    body: readLocalized(entry.body),
    image: readString(entry.image),
  }));

export const readTimeline = (value: unknown): TimelineBlock[] =>
  readArray(value, (entry: AdminDoc) => ({
    period: readString(entry.period),
    title: readLocalized(entry.title),
    detail: readLocalized(entry.detail),
    image: readString(entry.image),
  }));

export const readItems = (value: unknown): ItemBlock[] =>
  readArray(value, (entry: AdminDoc) => ({
    title: readLocalized(entry.title),
    detail: readLocalized(entry.detail),
    image: readString(entry.image),
    url: readString(entry.url),
  }));

export const readEntries = (value: unknown): EntryBlock[] =>
  readArray(value, (entry: AdminDoc) => ({
    title: readLocalized(entry.title),
    organisation: readString(entry.organisation),
    period: readString(entry.period),
    detail: readLocalized(entry.detail),
  }));

export const readCertifications = (value: unknown): CertificationBlock[] =>
  readArray(value, (entry: AdminDoc) => ({
    name: readString(entry.name),
    issuer: readString(entry.issuer),
    year: readString(entry.year),
  }));

export function SectionsRepeater({
  label,
  hint,
  addLabel,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  addLabel?: string;
  items: SectionBlock[];
  onChange: (items: SectionBlock[]) => void;
}) {
  return (
    <RepeaterField<SectionBlock>
      label={label}
      hint={hint}
      addLabel={addLabel ?? "Ajouter une section"}
      items={items}
      onChange={onChange}
      create={newSection}
      itemLabel={(item, index) => item.title.fr || `Section ${index + 1}`}
      renderItem={(item, update) => (
        <div className="grid gap-3">
          <LocalizedField label="Titre" value={item.title} onChange={(title) => update({ title })} />
          <LocalizedField label="Texte" multiline rows={5} value={item.body} onChange={(body) => update({ body })} />
          <ImageField label="Illustration" value={item.image} onChange={(image) => update({ image })} />
        </div>
      )}
    />
  );
}

export function TimelineRepeater({
  label,
  hint,
  addLabel,
  items,
  onChange,
  periodLabel = "Période",
}: {
  label: string;
  hint?: string;
  addLabel?: string;
  items: TimelineBlock[];
  onChange: (items: TimelineBlock[]) => void;
  periodLabel?: string;
}) {
  return (
    <RepeaterField<TimelineBlock>
      label={label}
      hint={hint}
      addLabel={addLabel ?? "Ajouter une étape"}
      items={items}
      onChange={onChange}
      create={newTimeline}
      itemLabel={(item, index) => [item.period, item.title.fr].filter(Boolean).join(" · ") || `Étape ${index + 1}`}
      renderItem={(item, update) => (
        <div className="grid gap-3">
          <TextField
            label={periodLabel}
            value={item.period}
            onChange={(period) => update({ period })}
            hint="Ex. « 2018 » ou « 2018 – 2021 »."
          />
          <LocalizedField label="Intitulé" value={item.title} onChange={(title) => update({ title })} />
          <LocalizedField label="Détail" multiline rows={3} value={item.detail} onChange={(detail) => update({ detail })} />
          <ImageField label="Illustration" value={item.image} onChange={(image) => update({ image })} />
        </div>
      )}
    />
  );
}

export function ItemsRepeater({
  label,
  hint,
  addLabel,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  addLabel?: string;
  items: ItemBlock[];
  onChange: (items: ItemBlock[]) => void;
}) {
  return (
    <RepeaterField<ItemBlock>
      label={label}
      hint={hint}
      addLabel={addLabel ?? "Ajouter"}
      items={items}
      onChange={onChange}
      create={newItem}
      itemLabel={(item, index) => item.title.fr || `Entrée ${index + 1}`}
      renderItem={(item, update) => (
        <div className="grid gap-3">
          <LocalizedField label="Titre" value={item.title} onChange={(title) => update({ title })} />
          <LocalizedField label="Description" multiline rows={3} value={item.detail} onChange={(detail) => update({ detail })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Lien" type="url" value={item.url} onChange={(url) => update({ url })} />
            <ImageField label="Illustration" value={item.image} onChange={(image) => update({ image })} />
          </div>
        </div>
      )}
    />
  );
}

export function EntriesRepeater({
  label,
  hint,
  addLabel,
  titleLabel,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  addLabel?: string;
  titleLabel: string;
  items: EntryBlock[];
  onChange: (items: EntryBlock[]) => void;
}) {
  return (
    <RepeaterField<EntryBlock>
      label={label}
      hint={hint}
      addLabel={addLabel ?? "Ajouter"}
      items={items}
      onChange={onChange}
      create={newEntry}
      itemLabel={(item, index) => item.title.fr || `${titleLabel} ${index + 1}`}
      renderItem={(item, update) => (
        <div className="grid gap-3">
          <LocalizedField label={titleLabel} value={item.title} onChange={(title) => update({ title })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Organisation"
              value={item.organisation}
              onChange={(organisation) => update({ organisation })}
            />
            <TextField
              label="Période"
              value={item.period}
              onChange={(period) => update({ period })}
              hint="Ex. « 2021 – aujourd’hui »."
            />
          </div>
          <LocalizedField label="Détail" multiline rows={4} value={item.detail} onChange={(detail) => update({ detail })} />
        </div>
      )}
    />
  );
}

export function CertificationsRepeater({
  items,
  onChange,
}: {
  items: CertificationBlock[];
  onChange: (items: CertificationBlock[]) => void;
}) {
  return (
    <RepeaterField<CertificationBlock>
      label="Certifications"
      addLabel="Ajouter une certification"
      items={items}
      onChange={onChange}
      create={newCertification}
      itemLabel={(item, index) => item.name || `Certification ${index + 1}`}
      renderItem={(item, update) => (
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Intitulé" value={item.name} onChange={(name) => update({ name })} />
          <TextField label="Organisme" value={item.issuer} onChange={(issuer) => update({ issuer })} />
          <TextField label="Année" value={item.year} onChange={(year) => update({ year })} />
        </div>
      )}
    />
  );
}
