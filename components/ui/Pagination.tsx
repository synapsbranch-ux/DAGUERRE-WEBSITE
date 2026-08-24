import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Pagination par liens.
 *
 * La page courante vit dans l'URL (`?page=`) : chaque page reste partageable,
 * indexable, et fonctionne sans JavaScript. `rel="prev"`/`rel="next"` aide les
 * moteurs à comprendre la série.
 */
export function Pagination({
  page,
  pageCount,
  buildHref,
  labels,
  className,
}: {
  page: number;
  pageCount: number;
  /** Construit l'URL d'une page en conservant les filtres actifs. */
  buildHref: (page: number) => string;
  labels: { previous: string; next: string; status: string };
  className?: string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav aria-label={labels.status} className={cn("flex items-center justify-between gap-4 py-8", className)}>
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          rel="prev"
          className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm transition-colors hover:bg-foreground/5"
        >
          ← {labels.previous}
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}

      <p className="tnum text-sm text-muted-foreground">
        {page} / {pageCount}
      </p>

      {page < pageCount ? (
        <Link
          href={buildHref(page + 1)}
          rel="next"
          className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm transition-colors hover:bg-foreground/5"
        >
          {labels.next} →
        </Link>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}
