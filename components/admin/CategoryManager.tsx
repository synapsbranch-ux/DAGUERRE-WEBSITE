"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/utils";

export type CategoryRow = { id: string; slug: string; nameFr: string; nameEn: string; count: number };

/**
 * Catégories de la bibliothèque.
 *
 * Elles sont gérées ici plutôt que codées en dur : l'offre évolue, et ajouter
 * « Automatisation » ne doit pas demander un déploiement.
 *
 * Une catégorie encore utilisée ne se supprime pas — le serveur refuse — pour
 * qu'aucune fiche ne perde son classement en silence.
 */
export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nameFr, setNameFr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const effectiveSlug = slug || slugify(nameFr);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const response = await fetch("/api/admin/resource-categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug: effectiveSlug,
        name: { fr: nameFr, en: nameEn },
        description: { fr: "", en: "" },
        order: categories.length,
      }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : "La création a échoué.");
      return;
    }

    setNameFr("");
    setNameEn("");
    setSlug("");
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg">Catégories</h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((value) => !value)}>
          {open ? "Masquer" : `Gérer (${categories.length})`}
        </Button>
      </div>

      {open ? (
        <>
          {categories.length > 0 ? (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {categories.map((category) => (
                <li key={category.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                  <span className="min-w-0 flex-1 truncate font-medium">{category.nameFr}</span>
                  <code className="text-xs text-muted-foreground">{category.slug}</code>
                  <span className="text-xs text-muted-foreground">
                    {category.count} ressource{category.count > 1 ? "s" : ""}
                  </span>
                  <ConfirmAction
                    trigger="Supprimer"
                    title="Supprimer cette catégorie ?"
                    description="La suppression est refusée tant qu'une ressource s'y rattache."
                    confirmLabel="Supprimer"
                    endpoint={`/api/admin/resource-categories/${category.id}`}
                    variant="ghost"
                    size="sm"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Aucune catégorie pour l&apos;instant.</p>
          )}

          <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="category-fr">Nom (FR)</Label>
              <Input
                id="category-fr"
                required
                value={nameFr}
                onChange={(event) => setNameFr(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="category-en">Nom (EN)</Label>
              <Input id="category-en" value={nameEn} onChange={(event) => setNameEn(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="category-slug">Slug</Label>
              <Input
                id="category-slug"
                value={slug}
                placeholder={slugify(nameFr) || "analytique"}
                onChange={(event) => setSlug(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-3">
              <Button disabled={busy || !nameFr}>{busy ? "Création…" : "Ajouter la catégorie"}</Button>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
          </form>
        </>
      ) : null}
    </section>
  );
}
