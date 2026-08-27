"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Types acceptés — la liste fait foi côté serveur, celle-ci filtre le sélecteur. */
const ACCEPT = [
  ".pdf",
  ".xlsx",
  ".xls",
  ".csv",
  ".docx",
  ".doc",
  ".pptx",
  ".ppt",
  ".zip",
  ".txt",
  ".json",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
].join(",");

const MAX_ATTACHMENTS = 5;

type Pending = { id: string; filename: string };

/**
 * Zone de rédaction d'un message.
 *
 * Le même composant sert le client et l'administration ; seuls les points
 * d'entrée changent, et ce sont eux qui décident des droits. Le texte part tel
 * quel : aucune mise en forme n'est interprétée, ni à l'écriture ni à
 * l'affichage.
 *
 * ## Pièces jointes
 *
 * Le fichier est déposé **avant** l'envoi du message, et le message ne
 * transporte que des identifiants. Deux raisons : l'auteur voit tout de suite
 * si son fichier est refusé — type, taille, signature binaire — plutôt qu'au
 * moment où il croit envoyer ; et un envoi qui échoue ne lui fait pas
 * reperdre son texte.
 *
 * Le serveur revérifie chaque identifiant reçu (`claimAttachments`) : seuls les
 * fichiers déposés par cet expéditeur pour cette conversation sont rattachés.
 * Un identifiant deviné n'attache donc rien.
 */
export function MessageComposer({
  endpoint,
  uploadEndpoint,
  label,
  sendLabel,
  sendingLabel,
  errorLabel,
  attachLabel,
  disabled,
  disabledLabel,
}: {
  endpoint: string;
  /** Dépôt des pièces jointes. Sans lui, le champ fichiers n'apparaît pas. */
  uploadEndpoint?: string;
  label: string;
  sendLabel: string;
  sendingLabel: string;
  errorLabel: string;
  attachLabel?: string;
  disabled?: boolean;
  disabledLabel?: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  if (disabled) {
    return <p className="text-sm text-muted-foreground">{disabledLabel}</p>;
  }

  async function upload(files: FileList) {
    if (!uploadEndpoint) return;

    setUploading(true);
    setError("");

    const room = MAX_ATTACHMENTS - attachments.length;

    for (const file of Array.from(files).slice(0, Math.max(0, room))) {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch(uploadEndpoint, { method: "POST", body: form }).catch(() => null);

      if (!response?.ok) {
        const payload = (await response?.json().catch(() => null)) as { error?: unknown } | null;
        setError(typeof payload?.error === "string" ? payload.error : errorLabel);
        break;
      }

      const payload = (await response.json()) as { id?: string; filename?: string };
      if (payload.id) {
        setAttachments((current) => [
          ...current,
          { id: payload.id as string, filename: payload.filename ?? file.name },
        ]);
      }
    }

    setUploading(false);
    // Sans cela, redéposer le même fichier ne déclencherait pas `change`.
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;

    setBusy(true);
    setError("");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, attachmentFileIds: attachments.map((file) => file.id) }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof payload?.error === "string" ? payload.error : errorLabel);
      return;
    }

    setBody("");
    setAttachments([]);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="message-body">{label}</Label>
        <Textarea
          id="message-body"
          rows={5}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>

      {uploadEndpoint ? (
        <div className="grid gap-1.5">
          <Label htmlFor="message-files">{attachLabel}</Label>
          <input
            ref={fileInput}
            id="message-files"
            type="file"
            multiple
            accept={ACCEPT}
            disabled={uploading || attachments.length >= MAX_ATTACHMENTS}
            onChange={(event) => {
              if (event.target.files?.length) void upload(event.target.files);
            }}
            className="text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm"
          />

          {attachments.length > 0 ? (
            <ul className="grid gap-1 text-xs">
              {attachments.map((file) => (
                <li key={file.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate">{file.filename}</span>
                  <button
                    type="button"
                    className="shrink-0 underline underline-offset-4"
                    onClick={() =>
                      setAttachments((current) => current.filter((item) => item.id !== file.id))
                    }
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={busy || uploading || !body.trim()}>
          {busy ? sendingLabel : sendLabel}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
