"use client";

import { FormShell, FormSection } from "@/components/admin/forms/FormShell";
import { ImageField } from "@/components/admin/forms/ImageField";
import {
  LocalizedField,
  RepeaterField,
  TextField,
  errorFor,
} from "@/components/admin/forms/fields";
import { useResourceForm } from "@/components/admin/forms/useResourceForm";
import { useSingletonDoc } from "@/components/admin/forms/useSingletonForm";
import { SingletonShell } from "@/components/admin/forms/SingletonShell";
import {
  emptyLocalized,
  readArray,
  readLocalized,
  readString,
  type AdminDoc,
  type Localized,
} from "@/components/admin/forms/types";

type Stat = { value: string; label: Localized };

type SettingsValue = {
  brandName: string;
  baseline: Localized;
  email: string;
  phone: string;
  city: string;
  region: string;
  country: string;
  cvUrl: string;
  calendlyUrl: string;
  canonicalUrl: string;
  heroEyebrow: Localized;
  heroTitle: Localized;
  heroLead: Localized;
  heroImage: string;
  title: Localized;
  description: Localized;
  defaultOgImage: string;
  footerText: Localized;
  stats: Stat[];
};

function read(doc: AdminDoc): SettingsValue {
  return {
    brandName: readString(doc.brandName),
    baseline: readLocalized(doc.baseline),
    email: readString(doc.email),
    phone: readString(doc.phone),
    city: readString(doc.city),
    region: readString(doc.region),
    country: readString(doc.country),
    cvUrl: readString(doc.cvUrl),
    calendlyUrl: readString(doc.calendlyUrl),
    canonicalUrl: readString(doc.canonicalUrl),
    heroEyebrow: readLocalized(doc.heroEyebrow),
    heroTitle: readLocalized(doc.heroTitle),
    heroLead: readLocalized(doc.heroLead),
    heroImage: readString(doc.heroImage),
    title: readLocalized(doc.title),
    description: readLocalized(doc.description),
    defaultOgImage: readString(doc.defaultOgImage),
    footerText: readLocalized(doc.footerText),
    stats: readArray(doc.stats, (entry) => ({
      value: readString(entry.value),
      label: readLocalized(entry.label),
    })),
  };
}

/** Réglages généraux du site : identité, coordonnées, hero, SEO, pied de page. */
export function SettingsForm() {
  const { doc, state } = useSingletonDoc("settings");
  if (state !== "ready" || !doc) return <SingletonShell state={state} />;
  return <SettingsFields initial={read(doc)} />;
}

function SettingsFields({ initial }: { initial: SettingsValue }) {
  const form = useResourceForm<SettingsValue>({
    initial,
    target: { url: "/api/admin/settings/settings", method: "PUT" },
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
          label="Nom de marque"
          required
          value={value.brandName}
          error={errorFor(errors, "brandName")}
          onChange={(brandName) => patch({ brandName })}
        />
        <LocalizedField
          label="Baseline"
          value={value.baseline}
          errorFr={errorFor(errors, "baseline.fr")}
          onChange={(baseline) => patch({ baseline })}
          hint="Courte accroche affichée à côté de la marque."
        />
      </FormSection>

      <FormSection title="Coordonnées" columns={2}>
        <TextField
          label="Courriel"
          type="email"
          value={value.email}
          error={errorFor(errors, "email")}
          onChange={(email) => patch({ email })}
        />
        <TextField
          label="Téléphone"
          type="tel"
          value={value.phone}
          error={errorFor(errors, "phone")}
          onChange={(phone) => patch({ phone })}
        />
        <TextField label="Ville" value={value.city} error={errorFor(errors, "city")} onChange={(city) => patch({ city })} />
        <TextField
          label="Région / province"
          value={value.region}
          error={errorFor(errors, "region")}
          onChange={(region) => patch({ region })}
        />
        <TextField
          label="Pays"
          value={value.country}
          error={errorFor(errors, "country")}
          onChange={(country) => patch({ country })}
        />
        <TextField
          label="Lien de prise de rendez-vous"
          type="url"
          value={value.calendlyUrl}
          error={errorFor(errors, "calendlyUrl")}
          onChange={(calendlyUrl) => patch({ calendlyUrl })}
          hint="Calendly ou équivalent. Vide, la section n’est pas affichée."
        />
        <TextField
          label="CV téléchargeable"
          type="url"
          value={value.cvUrl}
          error={errorFor(errors, "cvUrl")}
          onChange={(cvUrl) => patch({ cvUrl })}
        />
      </FormSection>

      <FormSection title="Hero de l’accueil">
        <LocalizedField
          label="Surtitre"
          value={value.heroEyebrow}
          errorFr={errorFor(errors, "heroEyebrow.fr")}
          onChange={(heroEyebrow) => patch({ heroEyebrow })}
        />
        <LocalizedField
          label="Titre"
          multiline
          rows={2}
          value={value.heroTitle}
          errorFr={errorFor(errors, "heroTitle.fr")}
          onChange={(heroTitle) => patch({ heroTitle })}
          hint="Les retours à la ligne sont conservés à l’affichage."
        />
        <LocalizedField
          label="Texte d’accroche"
          multiline
          rows={3}
          value={value.heroLead}
          errorFr={errorFor(errors, "heroLead.fr")}
          onChange={(heroLead) => patch({ heroLead })}
        />
        <ImageField
          label="Portrait du hero"
          value={value.heroImage}
          error={errorFor(errors, "heroImage")}
          onChange={(heroImage) => patch({ heroImage })}
          hint="Vide, le portrait du profil est utilisé."
        />
        <RepeaterField<Stat>
          label="Chiffres clés"
          hint="Trois valeurs maximum sont visibles dans le hero."
          items={value.stats}
          max={6}
          onChange={(stats) => patch({ stats })}
          create={() => ({ value: "", label: emptyLocalized() })}
          itemLabel={(stat, index) => stat.value || `Chiffre ${index + 1}`}
          renderItem={(stat, update) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Valeur" value={stat.value} onChange={(next) => update({ value: next })} />
              <LocalizedField label="Libellé" value={stat.label} onChange={(label) => update({ label })} />
            </div>
          )}
        />
      </FormSection>

      <FormSection title="Référencement et partage">
        <TextField
          label="URL canonique du site"
          type="url"
          value={value.canonicalUrl}
          error={errorFor(errors, "canonicalUrl")}
          onChange={(canonicalUrl) => patch({ canonicalUrl })}
          hint="Adresse de production, sans barre oblique finale. Alimente les balises canonical, le sitemap et Open Graph."
        />
        <LocalizedField
          label="Titre du site"
          value={value.title}
          errorFr={errorFor(errors, "title.fr")}
          onChange={(title) => patch({ title })}
        />
        <LocalizedField
          label="Description du site"
          multiline
          rows={3}
          value={value.description}
          errorFr={errorFor(errors, "description.fr")}
          onChange={(description) => patch({ description })}
        />
        <ImageField
          label="Image Open Graph par défaut"
          value={value.defaultOgImage}
          error={errorFor(errors, "defaultOgImage")}
          onChange={(defaultOgImage) => patch({ defaultOgImage })}
          hint="Utilisée quand une page n’a pas d’image propre. 1200 × 630."
        />
      </FormSection>

      <FormSection title="Pied de page">
        <LocalizedField
          label="Texte du pied de page"
          value={value.footerText}
          errorFr={errorFor(errors, "footerText.fr")}
          onChange={(footerText) => patch({ footerText })}
        />
      </FormSection>
    </FormShell>
  );
}
