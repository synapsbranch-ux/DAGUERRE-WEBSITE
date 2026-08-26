import type { ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/Pagination";

/**
 * Écrans de liste du tableau de bord.
 *
 * Ces composants s'appuient sur `Table`, `Empty` et `Pagination` de
 * shadcn/ui : chaque module du CMS — devis, abonnés, clients, campagnes —
 * partage donc la même mise en page, les mêmes états vides et la même
 * pagination, au lieu de trois tableaux qui divergent au premier ajout.
 *
 * **Tous les filtres passent par l'URL** (formulaire `GET`). Une liste filtrée
 * reste ainsi partageable et revenir en arrière la restitue ; surtout, la
 * requête est faite en base plutôt qu'en chargeant tout le jeu de données
 * dans le navigateur.
 */

export type AdminColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Colonne masquée sous `md` — pour que le tableau tienne sur une tablette. */
  secondary?: boolean;
  className?: string;
};

export function AdminPageHeader({
  group,
  title,
  description,
  actions,
}: {
  group: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow">{group}</p>
        <h1 className="mt-2 text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-[60ch] text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/**
 * Barre de filtres.
 *
 * `method="get"` : les champs deviennent des paramètres d'URL, ce qui donne
 * une recherche fonctionnelle sans JavaScript et une adresse partageable.
 */
export function AdminFilters({
  action,
  query,
  searchLabel,
  placeholder,
  children,
  reset = true,
}: {
  action: string;
  query: string;
  searchLabel: string;
  placeholder?: string;
  children?: ReactNode;
  reset?: boolean;
}) {
  return (
    <form action={action} method="get" className="mt-6 flex flex-wrap items-end gap-3">
      <div className="grid min-w-[220px] flex-1 gap-1.5">
        <Label htmlFor="admin-search">{searchLabel}</Label>
        <Input id="admin-search" name="q" type="search" defaultValue={query} placeholder={placeholder} />
      </div>
      {children}
      <Button type="submit" variant="secondary">
        Filtrer
      </Button>
      {reset ? (
        <Button asChild variant="ghost">
          <Link href={action}>Réinitialiser</Link>
        </Button>
      ) : null}
    </form>
  );
}

/** Liste déroulante de filtre, rendue côté serveur dans le formulaire GET. */
export function AdminSelect({
  name,
  label,
  value,
  options,
  anyLabel = "Tous",
}: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  anyLabel?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`filter-${name}`}>{label}</Label>
      <select
        id={`filter-${name}`}
        name={name}
        defaultValue={value}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm"
      >
        <option value="">{anyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AdminTable<T extends { id: string }>({
  columns,
  rows,
  empty,
}: {
  columns: AdminColumn<T>[];
  rows: T[];
  empty: { title: string; description: string; ctaLabel?: string; ctaHref?: string };
}) {
  if (rows.length === 0) {
    return (
      <Empty className="mt-8 border border-dashed border-border">
        <EmptyHeader>
          <EmptyTitle>{empty.title}</EmptyTitle>
          <EmptyDescription>{empty.description}</EmptyDescription>
        </EmptyHeader>
        {empty.ctaLabel && empty.ctaHref ? (
          <EmptyContent>
            <Button asChild size="sm">
              <Link href={empty.ctaHref}>{empty.ctaLabel}</Link>
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    // Le tableau défile dans son propre conteneur : la page, elle, ne part
    // jamais en défilement horizontal.
    <div className="mt-8 w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={column.secondary ? "hidden md:table-cell" : undefined}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={[column.secondary ? "hidden md:table-cell" : "", column.className ?? ""]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Pagination serveur : la page courante vit dans l'URL. */
export function AdminPagination({
  page,
  pageCount,
  buildHref,
}: {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}) {
  return (
    <Pagination
      page={page}
      pageCount={pageCount}
      buildHref={buildHref}
      labels={{ previous: "Précédent", next: "Suivant", status: "Pagination" }}
    />
  );
}

/** Message affiché quand MongoDB est injoignable. */
export function AdminDatabaseError({ title }: { title: string }) {
  return (
    <>
      <h1 className="text-4xl">{title}</h1>
      <p
        role="alert"
        className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
      >
        MongoDB est injoignable. Vérifiez <code>MONGODB_URI</code> puis rechargez la page.
      </p>
    </>
  );
}
