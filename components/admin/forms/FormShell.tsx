"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { cn } from "@/lib/utils";

/**
 * Cadre commun aux formulaires : barre d'état, erreurs globales, bouton
 * d'enregistrement et action de retrait (archivage ou suppression).
 */
export function FormShell({
  onSubmit,
  saving,
  notice,
  formError,
  dirty,
  children,
  removal,
  className,
}: {
  onSubmit: (event: React.FormEvent) => void;
  saving: boolean;
  notice: string;
  formError: string;
  dirty: boolean;
  children: ReactNode;
  removal?: ReactNode;
  className?: string;
}) {
  return (
    <form onSubmit={onSubmit} className={cn("grid max-w-4xl gap-6 pb-24", className)} noValidate>
      {formError ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      {children}

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-1 py-4 backdrop-blur">
        <Button disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
        {removal}
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {notice || (dirty ? "Modifications non enregistrées." : "")}
        </p>
      </div>
    </form>
  );
}

/** Sections visuelles d'un formulaire long, pour séparer contenu, média et SEO. */
export function FormSection({
  title,
  description,
  children,
  columns = 1,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  columns?: 1 | 2;
}) {
  return (
    <section className="grid gap-4 border-t border-border pt-6 first:border-t-0 first:pt-0">
      <div>
        <h2 className="font-heading text-xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>{children}</div>
    </section>
  );
}

/** Bouton d'archivage d'un contenu éditorial — jamais une suppression. */
export function ArchiveButton({ resource, id, section }: { resource: string; id: string; section: string }) {
  return (
    <ConfirmAction
      trigger="Archiver"
      title="Archiver ce contenu ?"
      description="Il disparaît immédiatement du site public mais reste modifiable ici, et peut être republié à tout moment."
      confirmLabel="Archiver"
      endpoint={`/api/admin/content/${resource}/${id}`}
      redirectTo={`/admin/${section}`}
    />
  );
}

/** Suppression définitive — réservée aux médias et aux messages. */
export function DeleteButton({
  resource,
  id,
  section,
  description,
}: {
  resource: string;
  id: string;
  section: string;
  description: string;
}) {
  return (
    <ConfirmAction
      trigger="Supprimer"
      title="Supprimer définitivement ?"
      description={description}
      confirmLabel="Supprimer définitivement"
      endpoint={`/api/admin/content/${resource}/${id}`}
      redirectTo={`/admin/${section}`}
    />
  );
}
