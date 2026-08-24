"use client";

import { FormShell, FormSection, DeleteButton } from "@/components/admin/forms/FormShell";
import { ImagePreview } from "@/components/admin/forms/ImageField";
import { LocalizedField, TextField, errorFor } from "@/components/admin/forms/fields";
import { useResourceForm } from "@/components/admin/forms/useResourceForm";
import { CopyUrlButton } from "@/components/admin/CopyUrlButton";
import { readLocalized, readString, type AdminDoc, type Localized } from "@/components/admin/forms/types";
import { formatDate } from "@/lib/utils";

type MediaValue = {
  name: string;
  alt: Localized;
  category: string;
};

/** Source affichable d'un média, quelle que soit son origine. */
export function mediaUrlOf(doc: AdminDoc): string {
  if (doc.provider === "gridfs") return `/api/media/${String(doc._id)}`;
  return readString(doc.externalUrl);
}

const providerLabels: Record<string, string> = {
  gridfs: "Téléversé (GridFS)",
  "google-drive": "Google Drive",
  external: "URL externe",
};

/**
 * Fiche d'un média.
 *
 * Le fichier lui-même n'est pas modifiable : remplacer une image reviendrait à
 * changer silencieusement le contenu servi par une URL déjà utilisée ailleurs.
 * Seules les métadonnées — nom, texte alternatif, catégorie — se modifient.
 */
export function MediaForm({ id, initial }: { id: string; initial: AdminDoc }) {
  const source = mediaUrlOf(initial);
  const provider = readString(initial.provider, "external");

  const form = useResourceForm<MediaValue>({
    initial: {
      name: readString(initial.name) || readString(initial.filename),
      alt: readLocalized(initial.alt),
      category: readString(initial.category),
    },
    target: { url: `/api/admin/content/media/${id}`, method: "PATCH" },
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
      removal={
        <DeleteButton
          resource="media"
          id={id}
          section="media"
          description={
            provider === "gridfs"
              ? "Le fichier et ses fragments seront effacés du stockage. Les pages qui l’utilisent perdront leur image."
              : "La référence sera supprimée de la bibliothèque. Le fichier distant, lui, n’est pas touché."
          }
        />
      }
    >
      <FormSection title="Fichier" description="Origine et aperçu — non modifiables.">
        <ImagePreview src={source} className="[&>img]:h-40 [&>img]:w-64" />
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Origine</dt>
            <dd>{providerLabels[provider] ?? provider}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Nom de fichier</dt>
            <dd className="truncate">{readString(initial.filename) || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Dimensions</dt>
            <dd>
              {typeof initial.width === "number" && initial.width > 0
                ? `${initial.width} × ${initial.height} px`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Ajouté le</dt>
            <dd>{formatDate(initial.createdAt)}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-sm border border-border px-2 py-1 text-xs">{source}</code>
          <CopyUrlButton url={source} />
        </div>
      </FormSection>

      <FormSection title="Métadonnées" columns={2}>
        <TextField
          label="Nom"
          required
          value={value.name}
          error={errorFor(errors, "name")}
          onChange={(name) => patch({ name })}
          hint="Nom affiché dans la bibliothèque."
        />
        <TextField
          label="Catégorie"
          value={value.category}
          error={errorFor(errors, "category")}
          onChange={(category) => patch({ category })}
          hint="Facultatif : sert à regrouper les médias."
        />
        <LocalizedField
          label="Texte alternatif"
          multiline
          rows={2}
          value={value.alt}
          errorFr={errorFor(errors, "alt.fr")}
          onChange={(alt) => patch({ alt })}
          hint="Décrit l’image pour les lecteurs d’écran. Laissez vide si l’image est purement décorative."
          className="sm:col-span-2"
        />
      </FormSection>
    </FormShell>
  );
}
