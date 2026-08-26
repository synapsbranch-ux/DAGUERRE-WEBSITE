"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type UploadedFile = {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
};

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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

/**
 * Dépôt de fichier privé.
 *
 * Glisser-déposer, sélection classique, barre de progression réelle et
 * message d'erreur explicite — un `<input type="file">` nu ne dit ni ce qui
 * est accepté, ni où en est un envoi de quinze mégaoctets.
 *
 * La progression vient de `XMLHttpRequest` : `fetch` ne rapporte pas encore
 * l'avancement d'un corps de requête dans les navigateurs courants.
 *
 * Le composant ne fait qu'envoyer : c'est le serveur qui valide type, taille
 * et signature binaire, et lui seul décide de la portée du fichier.
 */
export function FileUpload({
  label,
  hint,
  visibility,
  ownerUserId,
  quoteRequestId,
  projectId,
  onUploaded,
  buttonLabel = "Téléverser",
  className,
}: {
  label: string;
  hint?: string;
  visibility: string;
  ownerUserId?: string;
  quoteRequestId?: string;
  projectId?: string;
  onUploaded: (file: UploadedFile) => void;
  buttonLabel?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  function upload(file: File) {
    setError("");
    setDone("");
    setProgress(0);

    const data = new FormData();
    data.set("file", file);
    data.set("visibility", visibility);
    if (ownerUserId) data.set("ownerUserId", ownerUserId);
    if (quoteRequestId) data.set("quoteRequestId", quoteRequestId);
    if (projectId) data.set("projectId", projectId);
    data.set("label", file.name);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/files/upload");

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
    });

    request.addEventListener("load", () => {
      setProgress(null);
      let payload: { error?: string } & Partial<UploadedFile>;
      try {
        payload = JSON.parse(request.responseText) as typeof payload;
      } catch {
        setError("Réponse du serveur illisible.");
        return;
      }

      if (request.status >= 400 || !payload.id) {
        setError(payload.error || "Le téléversement a échoué.");
        return;
      }

      setDone(`${payload.filename} déposé.`);
      onUploaded(payload as UploadedFile);
      if (inputRef.current) inputRef.current.value = "";
    });

    request.addEventListener("error", () => {
      setProgress(null);
      setError("Le serveur est injoignable.");
    });

    request.send(data);
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor="file-upload-input">{label}</Label>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        className={cn(
          "grid gap-3 rounded-lg border border-dashed p-5 text-center transition-colors",
          dragging ? "border-foreground bg-foreground/5" : "border-border",
        )}
      >
        <p className="text-sm text-muted-foreground">
          Glissez un fichier ici, ou choisissez-le.
        </p>

        <input
          ref={inputRef}
          id="file-upload-input"
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload(file);
          }}
        />

        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={progress !== null}
            onClick={() => inputRef.current?.click()}
          >
            {progress !== null ? `Envoi… ${progress} %` : buttonLabel}
          </Button>
        </div>

        {progress !== null ? (
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression du téléversement"
            className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10"
          >
            <div
              className="h-full bg-foreground transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </div>

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {done ? (
        <p role="status" className="text-xs text-muted-foreground">
          {done}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { formatSize };
