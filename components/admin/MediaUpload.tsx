"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImagePreview } from "@/components/admin/forms/ImageField";

/**
 * Deux façons d'alimenter la bibliothèque.
 *
 * - **Téléverser** : le fichier part en GridFS et devient `/api/media/<id>`,
 *   servi par le site lui-même.
 * - **Référencer** : un fichier déjà hébergé (Google Drive, CDN) est enregistré
 *   par son URL, sans copie.
 *
 * Les deux produisent un média utilisable partout dans le CMS.
 */
export function MediaUpload() {
  const [mode, setMode] = useState<"upload" | "external">("upload");

  return (
    <section className="mt-6 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-heading text-lg">Ajouter un média</h2>
        <Button
          type="button"
          size="sm"
          variant={mode === "upload" ? "default" : "secondary"}
          aria-pressed={mode === "upload"}
          onClick={() => setMode("upload")}
        >
          Téléverser
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "external" ? "default" : "secondary"}
          aria-pressed={mode === "external"}
          onClick={() => setMode("external")}
        >
          Google Drive / URL
        </Button>
      </div>

      <div className="mt-4">{mode === "upload" ? <UploadForm /> : <ExternalMediaForm />}</div>
    </section>
  );
}

function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setMessage("");
    setError("");

    const data = new FormData();
    data.set("file", file);
    data.set("name", name || file.name);
    data.set("alt", alt);
    data.set("category", category);

    const response = await fetch("/api/admin/media/upload", { method: "POST", body: data });
    setBusy(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "L’envoi a échoué.");
      return;
    }

    setFile(null);
    setName("");
    setAlt("");
    setCategory("");
    setMessage("Média ajouté à la bibliothèque.");
    router.refresh();
  }

  return (
    <form onSubmit={upload} className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="media-file">Image</Label>
        <Input
          id="media-file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          required
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <p className="text-xs text-muted-foreground">JPEG, PNG, WebP ou AVIF — 10 Mo maximum.</p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="media-name">Nom</Label>
        <Input
          id="media-name"
          value={name}
          placeholder={file?.name ?? "Nom dans la bibliothèque"}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="media-category">Catégorie</Label>
        <Input id="media-category" value={category} onChange={(event) => setCategory(event.target.value)} />
      </div>

      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="media-alt">Texte alternatif (FR)</Label>
        <Input id="media-alt" value={alt} maxLength={1000} onChange={(event) => setAlt(event.target.value)} />
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button disabled={busy || !file}>{busy ? "Envoi…" : "Téléverser"}</Button>
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** Enregistre un média déjà hébergé ailleurs (Google Drive, CDN). */
function ExternalMediaForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  /** Un lien de partage Drive devient une URL d'image directement affichable. */
  const driveId = url.match(/(?:\/d\/|[?&]id=)([a-zA-Z0-9_-]{20,})/)?.[1];
  const resolved = driveId ? `https://drive.google.com/uc?export=view&id=${driveId}` : url.trim();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    const response = await fetch("/api/admin/media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name || resolved.split("/").pop() || "Média externe",
        filename: name || resolved.split("/").pop() || "media-externe",
        provider: driveId ? "google-drive" : "external",
        providerId: driveId ?? "",
        externalUrl: resolved,
        alt: { fr: alt, en: "" },
        category,
      }),
    });
    setBusy(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      setError(
        typeof body?.error === "string"
          ? body.error
          : "Vérifiez l’URL : elle doit être absolue et publiquement accessible.",
      );
      return;
    }

    setUrl("");
    setName("");
    setAlt("");
    setCategory("");
    setMessage("Média externe enregistré.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="external-url">URL du fichier</Label>
        <Input
          id="external-url"
          type="url"
          required
          value={url}
          placeholder="https://drive.google.com/file/d/… ou https://cdn.exemple.com/image.png"
          onChange={(event) => setUrl(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          {driveId
            ? "Lien Google Drive reconnu : il sera converti en URL d’affichage directe. Le fichier doit être partagé publiquement."
            : "URL absolue du fichier, accessible sans authentification."}
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="external-name">Nom</Label>
        <Input id="external-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="external-category">Catégorie</Label>
        <Input id="external-category" value={category} onChange={(event) => setCategory(event.target.value)} />
      </div>

      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor="external-alt">Texte alternatif (FR)</Label>
        <Input id="external-alt" value={alt} maxLength={1000} onChange={(event) => setAlt(event.target.value)} />
      </div>

      {resolved ? (
        <div className="sm:col-span-2">
          <ImagePreview src={resolved} />
        </div>
      ) : null}

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button disabled={busy || !url.trim()}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
