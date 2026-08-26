"use client";

import { useState } from "react";

import { FileUpload, formatSize, type UploadedFile } from "@/components/admin/FileUpload";
import { FormSection, FormShell } from "@/components/admin/forms/FormShell";
import { ImageField } from "@/components/admin/forms/ImageField";
import { SlugField } from "@/components/admin/forms/SlugField";
import {
  LocalizedField,
  MarkdownField,
  SelectField,
  TextField,
  errorFor,
} from "@/components/admin/forms/fields";
import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { useResourceForm } from "@/components/admin/forms/useResourceForm";
import { Button } from "@/components/ui/button";
import {
  resourceTypeLabels,
  resourceTypes,
  resourceVisibilities,
  resourceVisibilityLabels,
} from "@/lib/platform/enums";

type Localized = { fr: string; en: string };

export type ResourceValue = {
  slug: Localized;
  title: Localized;
  description: Localized;
  body: Localized;
  type: string;
  visibility: string;
  status: "draft" | "published" | "archived";
  coverImage: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  externalUrl: string;
  categoryId: string;
  allowedUserIds: string[];
  publishedAt: string;
};

export const emptyResource: ResourceValue = {
  slug: { fr: "", en: "" },
  title: { fr: "", en: "" },
  description: { fr: "", en: "" },
  body: { fr: "", en: "" },
  type: "pdf",
  visibility: "public",
  status: "draft",
  coverImage: "",
  fileId: "",
  fileName: "",
  fileSize: 0,
  externalUrl: "",
  categoryId: "",
  allowedUserIds: [],
  publishedAt: "",
};

/**
 * Fiche d'une ressource de la bibliothèque.
 *
 * Une ressource porte **soit** un fichier déposé ici, **soit** une URL
 * externe : les deux à la fois laisseraient deux vérités sur ce que le
 * visiteur reçoit en cliquant « Télécharger ».
 *
 * La portée est le champ le plus lourd de conséquences : le formulaire dit,
 * sous le sélecteur, ce que chaque valeur autorise vraiment.
 */
export function ContentResourceForm({
  id,
  initial,
  categories,
  clients,
}: {
  id?: string;
  initial?: ResourceValue;
  categories: { id: string; name: string }[];
  clients: { id: string; label: string }[];
}) {
  const [attached, setAttached] = useState<UploadedFile | null>(null);
  // Le slug suit le titre tant que l'administrateur ne l'a pas repris à la main.
  const [autoSlug, setAutoSlug] = useState(() => !initial?.slug.fr);

  const form = useResourceForm<ResourceValue>({
    initial: initial ?? emptyResource,
    target: {
      url: id ? `/api/admin/resources/${id}` : "/api/admin/resources",
      method: id ? "PATCH" : "POST",
      redirectTo: id ? undefined : "/admin/ressources",
    },
    toPayload: (value) => ({
      slug: value.slug,
      title: value.title,
      description: value.description,
      body: value.body,
      type: value.type,
      visibility: value.visibility,
      status: value.status,
      coverImage: value.coverImage,
      fileId: value.fileId,
      externalUrl: value.externalUrl,
      categoryId: value.categoryId,
      allowedUserIds: value.allowedUserIds,
      publishedAt: value.publishedAt,
    }),
  });

  const { value, patch, errors } = form;

  const visibilityHint: Record<string, string> = {
    public: "Visible et téléchargeable par tout visiteur, sans compte.",
    authenticated: "Réservée aux comptes connectés, quels qu'ils soient.",
    private: "Réservée aux comptes nommément désignés ci-dessous.",
  };

  return (
    <FormShell
      onSubmit={form.submit}
      saving={form.saving}
      notice={form.notice}
      formError={form.formError}
      dirty={form.dirty}
      removal={
        id ? (
          <ConfirmAction
            trigger="Archiver"
            title="Archiver cette ressource ?"
            description="Elle disparaît du site public et de l'espace client, mais reste modifiable et republiable ici."
            confirmLabel="Archiver"
            endpoint={`/api/admin/resources/${id}`}
            redirectTo="/admin/ressources"
            variant="secondary"
          />
        ) : undefined
      }
    >
      <FormSection title="Identité" columns={2}>
        <LocalizedField
          label="Titre"
          required
          value={value.title}
          onChange={(title) => patch({ title })}
          errorFr={errorFor(errors, "title.fr")}
          errorEn={errorFor(errors, "title.en")}
        />
        <SlugField
          value={value.slug}
          title={value.title.fr}
          auto={autoSlug}
          onAutoChange={setAutoSlug}
          onChange={(slug) => patch({ slug })}
          errorFr={errorFor(errors, "slug.fr")}
          errorEn={errorFor(errors, "slug.en")}
        />
        <LocalizedField
          label="Description"
          multiline
          value={value.description}
          onChange={(description) => patch({ description })}
          className="sm:col-span-2"
        />
      </FormSection>

      <FormSection title="Classement" columns={2}>
        <SelectField
          label="Type"
          value={value.type}
          onChange={(type) => patch({ type })}
          options={resourceTypes.map((entry) => ({ value: entry, label: resourceTypeLabels[entry].fr }))}
        />
        <SelectField
          label="Catégorie"
          value={value.categoryId}
          onChange={(categoryId) => patch({ categoryId })}
          options={[{ value: "", label: "Sans catégorie" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          hint="Les catégories se gèrent depuis la liste des ressources."
        />
      </FormSection>

      <FormSection title="Fichier">
        {value.fileId ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
            <span className="min-w-0 flex-1 truncate font-medium">
              {attached?.filename || value.fileName || "Fichier joint"}
            </span>
            {(attached?.size ?? value.fileSize) > 0 ? (
              <span className="text-xs text-muted-foreground">
                {formatSize(attached?.size ?? value.fileSize)}
              </span>
            ) : null}
            <Button asChild variant="ghost" size="sm">
              <a href={`/api/files/${value.fileId}`}>Télécharger</a>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setAttached(null);
                patch({ fileId: "", fileName: "", fileSize: 0 });
              }}
            >
              Détacher
            </Button>
          </div>
        ) : (
          <FileUpload
            label="Document"
            hint="PDF, tableur, document, présentation, archive ou image — 20 Mo maximum. Le fichier n'est jamais servi par une URL publique permanente."
            visibility={value.visibility === "public" ? "public" : "client_account"}
            onUploaded={(file) => {
              setAttached(file);
              patch({ fileId: file.id, fileName: file.filename, fileSize: file.size });
            }}
          />
        )}

        <TextField
          label="ou URL externe"
          type="url"
          value={value.externalUrl}
          onChange={(externalUrl) => patch({ externalUrl })}
          hint="Pour une ressource hébergée ailleurs. Laissez vide si un fichier est déposé ci-dessus."
          error={errorFor(errors, "externalUrl", "fileId")}
        />
      </FormSection>

      <FormSection title="Accès" columns={2}>
        <SelectField
          label="Portée"
          value={value.visibility}
          onChange={(visibility) => patch({ visibility })}
          options={resourceVisibilities.map((entry) => ({
            value: entry,
            label: resourceVisibilityLabels[entry].fr,
          }))}
          hint={visibilityHint[value.visibility]}
        />

        {value.visibility === "private" ? (
          <div className="grid gap-1.5 sm:col-span-2">
            <p className="text-sm font-medium">Comptes autorisés</p>
            <p className="text-xs text-muted-foreground">
              Seuls ces comptes verront et pourront télécharger la ressource.
            </p>
            <ul className="mt-1 grid gap-1.5">
              {clients.map((client) => {
                const checked = value.allowedUserIds.includes(client.id);
                return (
                  <li key={client.id} className="flex items-center gap-2">
                    <input
                      id={`allowed-${client.id}`}
                      type="checkbox"
                      checked={checked}
                      className="size-4 rounded-sm border border-border accent-foreground"
                      onChange={(event) =>
                        patch({
                          allowedUserIds: event.target.checked
                            ? [...value.allowedUserIds, client.id]
                            : value.allowedUserIds.filter((entry) => entry !== client.id),
                        })
                      }
                    />
                    <label htmlFor={`allowed-${client.id}`} className="text-sm">
                      {client.label}
                    </label>
                  </li>
                );
              })}
              {clients.length === 0 ? (
                <li className="text-sm text-muted-foreground">Aucun compte client pour l&apos;instant.</li>
              ) : null}
            </ul>
            {errorFor(errors, "allowedUserIds") ? (
              <p role="alert" className="text-xs text-destructive">
                {errorFor(errors, "allowedUserIds")}
              </p>
            ) : null}
          </div>
        ) : null}
      </FormSection>

      <FormSection title="Présentation" columns={2}>
        <ImageField
          label="Couverture"
          value={value.coverImage}
          onChange={(coverImage) => patch({ coverImage })}
        />
        <SelectField
          label="État"
          value={value.status}
          onChange={(status) => patch({ status })}
          options={[
            { value: "draft", label: "Brouillon" },
            { value: "published", label: "Publiée" },
            { value: "archived", label: "Archivée" },
          ]}
        />
        <TextField
          label="Date de publication"
          type="datetime-local"
          value={value.publishedAt}
          onChange={(publishedAt) => patch({ publishedAt })}
          hint="Une date future planifie la publication."
        />
      </FormSection>

      <FormSection title="Contenu long">
        <MarkdownField
          label="Présentation détaillée"
          value={value.body}
          onChange={(body) => patch({ body })}
        />
      </FormSection>
    </FormShell>
  );
}
