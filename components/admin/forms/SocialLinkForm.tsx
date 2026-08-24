"use client";

import { FormShell, FormSection, DeleteButton } from "@/components/admin/forms/FormShell";
import { NumberField, SwitchField, TextField, errorFor } from "@/components/admin/forms/fields";
import { useResourceForm } from "@/components/admin/forms/useResourceForm";
import {
  readBoolean,
  readNumber,
  readString,
  type AdminDoc,
} from "@/components/admin/forms/types";

type SocialValue = {
  platform: string;
  label: string;
  url: string;
  enabled: boolean;
  order: number | null;
};

function read(doc: AdminDoc | undefined): SocialValue {
  const source = doc ?? {};
  return {
    platform: readString(source.platform),
    label: readString(source.label),
    url: readString(source.url),
    enabled: readBoolean(source.enabled, true),
    order: readNumber(source.order) ?? 0,
  };
}

/**
 * Formulaire d'un lien social.
 *
 * Les liens actifs alimentent l'en-tête, le pied de page et la page « Liens ».
 * Un lien désactivé reste enregistré mais n'est publié nulle part — pratique
 * pour préparer un profil avant son ouverture.
 */
export function SocialLinkForm({ id, initial }: { id?: string; initial?: AdminDoc }) {
  const form = useResourceForm<SocialValue>({
    initial: read(initial),
    target: id
      ? { url: `/api/admin/content/social/${id}`, method: "PATCH" }
      : { url: "/api/admin/social", method: "POST", redirectTo: "/admin/social" },
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
            resource="social"
            id={id}
            section="social"
            description="Ce lien sera retiré de la base. Pour le masquer sans le perdre, désactivez-le plutôt."
          />
        ) : undefined
      }
    >
      <FormSection title="Lien social" columns={2}>
        <TextField
          label="Plateforme"
          required
          value={value.platform}
          error={errorFor(errors, "platform")}
          onChange={(platform) => patch({ platform })}
          hint="Ex. LinkedIn, GitHub, YouTube."
        />
        <TextField
          label="Libellé affiché"
          required
          value={value.label}
          error={errorFor(errors, "label")}
          onChange={(label) => patch({ label })}
          hint="Texte du lien sur le site."
        />
        <TextField
          label="URL du profil"
          type="url"
          required
          value={value.url}
          error={errorFor(errors, "url")}
          onChange={(url) => patch({ url })}
          hint="URL absolue complète (https://…). Elle alimente aussi les données structurées."
          className="sm:col-span-2"
        />
      </FormSection>

      <FormSection title="Affichage" columns={2}>
        <NumberField
          label="Ordre"
          value={value.order}
          min={0}
          max={999}
          error={errorFor(errors, "order")}
          onChange={(order) => patch({ order })}
        />
        <SwitchField
          label="Actif"
          checked={value.enabled}
          onChange={(enabled) => patch({ enabled })}
          hint="Seuls les liens actifs apparaissent dans l’en-tête, le pied de page et la page Liens."
        />
      </FormSection>
    </FormShell>
  );
}
