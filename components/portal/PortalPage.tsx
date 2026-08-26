import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";

/**
 * En-tête d'une page de l'espace client.
 *
 * Le `<h1>` de la page vit ici : l'espace client est rendu à l'intérieur du
 * layout public, qui n'en pose aucun.
 */
export function PortalHeader({
  eyebrow,
  title,
  lead,
  actions,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">| {eyebrow} |</p> : null}
        <h1 className="mt-3 font-heading text-3xl leading-tight sm:text-4xl">{title}</h1>
        {lead ? <p className="mt-3 max-w-[60ch] text-sm text-muted-foreground">{lead}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

/** Panneau de contenu : titre de section, action facultative, corps. */
export function PortalPanel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * État vide — composant `Empty` de shadcn/ui.
 *
 * Chaque état vide porte une action : « aucune donnée » sans issue laisse le
 * client devant une impasse.
 */
export function PortalEmpty({
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <Empty className="border border-dashed border-border">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {ctaLabel && ctaHref ? (
        <EmptyContent>
          <Button asChild size="sm">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

/** Pastille de statut, rendue à partir d'un libellé déjà traduit. */
export function StatusPill({
  label,
  tone = "outline",
}: {
  label: string;
  tone?: "default" | "secondary" | "outline" | "destructive";
}) {
  return <Badge variant={tone}>{label}</Badge>;
}
