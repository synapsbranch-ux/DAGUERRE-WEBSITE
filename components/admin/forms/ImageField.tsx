"use client";

import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Champ image : URL externe **ou** média de la bibliothèque.
 *
 * La valeur stockée est soit une URL absolue, soit `/api/media/<id>` — les deux
 * formes acceptées par `imageRef` dans `lib/validation.ts`. Un aperçu est
 * toujours affiché, y compris pour les médias GridFS, afin qu'une URL cassée se
 * voie avant publication et non après.
 */

type MediaEntry = {
  _id: string;
  name?: string;
  filename?: string;
  provider?: string;
  externalUrl?: string;
  alt?: { fr?: string };
};

export function mediaSource(entry: MediaEntry): string {
  if (entry.provider === "gridfs") return `/api/media/${entry._id}`;
  return entry.externalUrl ?? "";
}

export function ImageField({
  label,
  value,
  onChange,
  hint,
  error,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  className?: string;
}) {
  const id = useId();

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          placeholder="https://… ou /api/media/…"
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <MediaPicker onSelect={onChange} />
        {value ? (
          <Button type="button" variant="ghost" onClick={() => onChange("")}>
            Retirer
          </Button>
        ) : null}
      </div>

      <ImagePreview src={value} />

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Aperçu tolérant : une source injoignable affiche un avertissement lisible. */
export function ImagePreview({ src, className }: { src: string; className?: string }) {
  // On mémorise *quelle* source a échoué, pas un simple booléen : corriger
  // l'URL réaffiche donc l'aperçu sans avoir à réinitialiser l'état.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);

  if (!src.trim()) return null;

  return (
    <div className={cn("mt-1 flex items-center gap-3", className)}>
      {brokenSrc === src ? (
        <p className="text-xs text-destructive">
          Aperçu impossible : vérifiez que l’URL est publique.
        </p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- source arbitraire saisie dans le CMS
        <img
          src={src}
          alt=""
          className="h-20 w-32 rounded-sm border border-border object-cover"
          onError={() => setBrokenSrc(src)}
        />
      )}
    </div>
  );
}

/** Sélecteur puisant dans la bibliothèque de médias déjà téléversés. */
function MediaPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<MediaEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || entries) return;
    let cancelled = false;
    fetch("/api/admin/media")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("chargement"))))
      .then((data: MediaEntry[]) => {
        if (!cancelled) setEntries(data.map((entry) => ({ ...entry, _id: String(entry._id) })));
      })
      .catch(() => {
        if (!cancelled) setError("La bibliothèque n’a pas pu être chargée.");
      });
    return () => {
      cancelled = true;
    };
  }, [open, entries]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary">
          Bibliothèque
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choisir un média</DialogTitle>
          <DialogDescription>
            Les images téléversées et les médias externes déjà enregistrés.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!entries && !error ? <p className="text-sm text-muted-foreground">Chargement…</p> : null}
        {entries && entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun média. Ajoutez-en depuis la section Médias.
          </p>
        ) : null}

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {entries?.map((entry) => {
            const src = mediaSource(entry);
            return (
              <li key={entry._id}>
                <button
                  type="button"
                  className="w-full rounded-sm border border-border p-2 text-left transition-colors hover:bg-foreground/5"
                  onClick={() => {
                    onSelect(src);
                    setOpen(false);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- source arbitraire */}
                  <img src={src} alt="" className="h-24 w-full rounded-sm object-cover" />
                  <span className="mt-2 block truncate text-xs">{entry.name || entry.filename}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

/** Galerie : plusieurs images, ordonnées. */
export function GalleryField({
  label,
  values,
  onChange,
  hint,
  error,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  hint?: string;
  error?: string;
}) {
  const [draft, setDraft] = useState("");

  const add = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <fieldset className="grid gap-3 rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      {hint ? <p className="-mt-1 text-xs text-muted-foreground">{hint}</p> : null}

      {values.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune image dans la galerie.</p>
      ) : (
        <ul className="grid gap-2">
          {values.map((src, index) => (
            <li key={src} className="flex items-center gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0">
              <ImagePreview src={src} />
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{src}</span>
              <Button type="button" variant="ghost" size="sm" aria-label="Monter" disabled={index === 0} onClick={() => move(index, -1)}>
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Descendre"
                disabled={index === values.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(values.filter((entry) => entry !== src))}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder="https://… ou /api/media/…"
          aria-label={`Ajouter une image à ${label}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            }
          }}
        />
        <MediaPicker onSelect={add} />
        <Button type="button" variant="secondary" onClick={() => add(draft)}>
          Ajouter
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
