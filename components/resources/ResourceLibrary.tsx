import Link from "next/link";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/Pagination";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { labelOf, resourceTypeLabels, resourceVisibilityLabels } from "@/lib/platform/enums";
import { formatDate } from "@/lib/platform/format";
import type { ResourceCategoryEntry, ResourceSummary } from "@/lib/platform/queries";
import { optionalImage } from "@/lib/media/resolve";
import { EditorialImage } from "@/components/motion/EditorialImage";

/**
 * Bibliothèque de ressources.
 *
 * Le même composant sert la page publique et celle de l'espace client : seules
 * changent les fiches que la requête a laissées passer. Deux implémentations
 * auraient fini par diverger, et c'est précisément sur ce genre d'écart qu'une
 * ressource réservée finit par s'afficher au mauvais endroit.
 *
 * Recherche et filtres passent par l'URL (`GET`) : la sélection reste
 * partageable, fonctionne sans JavaScript, et le tri se fait en base.
 */
export function ResourceLibrary({
  dict,
  locale,
  basePath,
  items,
  categories,
  total,
  page,
  pageSize,
  query,
  activeCategory,
  activeType,
  signedIn,
}: {
  dict: Dictionary;
  locale: Locale;
  /** Chemin de la page courante — public ou espace client. */
  basePath: string;
  items: ResourceSummary[];
  categories: ResourceCategoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  activeCategory: string;
  activeType: string;
  signedIn: boolean;
}) {
  const t = dict.platform.resources;

  const buildHref = (next: Record<string, string | number>) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (activeCategory) params.set("categorie", activeCategory);
    if (activeType) params.set("type", activeType);
    for (const [key, value] of Object.entries(next)) {
      if (value === "" || value === 1) params.delete(key);
      else params.set(key, String(value));
    }
    const search = params.toString();
    return search ? `${basePath}?${search}` : basePath;
  };

  return (
    <>
      <form action={basePath} method="get" className="flex flex-wrap items-end gap-3 py-8">
        <div className="grid min-w-[240px] flex-1 gap-1.5">
          <Label htmlFor="resource-search">{dict.platform.common.search}</Label>
          <Input
            id="resource-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t.searchPlaceholder}
          />
        </div>
        {activeCategory ? <input type="hidden" name="categorie" value={activeCategory} /> : null}
        {activeType ? <input type="hidden" name="type" value={activeType} /> : null}
        <Button type="submit" variant="secondary">
          {dict.platform.common.search}
        </Button>
      </form>

      {categories.length > 0 ? (
        <nav aria-label={t.category} className="flex flex-wrap gap-2 pb-8">
          <Link
            href={buildHref({ categorie: "", page: 1 })}
            aria-current={activeCategory ? undefined : "page"}
            className={chip(!activeCategory)}
          >
            {dict.platform.common.all}
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={buildHref({ categorie: category.slug, page: 1 })}
              aria-current={activeCategory === category.slug ? "page" : undefined}
              className={chip(activeCategory === category.slug)}
            >
              {category.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {items.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>{t.emptyTitle}</EmptyTitle>
            <EmptyDescription>{t.emptyBody}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((resource) => {
            const cover = optionalImage(resource.coverImage);
            const restricted = resource.visibility !== "public" && !signedIn;

            return (
              <li key={resource.id}>
                <Card className="h-full overflow-hidden pt-0">
                  {cover ? (
                    <EditorialImage
                      src={cover}
                      alt=""
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                      className="aspect-[16/10] w-full border-b border-border"
                    />
                  ) : null}

                  <CardHeader className="gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{labelOf(resourceTypeLabels, resource.type, locale)}</Badge>
                      {resource.categoryName ? (
                        <Badge variant="outline">{resource.categoryName}</Badge>
                      ) : null}
                      {restricted ? (
                        <Badge variant="outline">
                          {labelOf(resourceVisibilityLabels, resource.visibility, locale)}
                        </Badge>
                      ) : null}
                    </div>
                    <CardTitle className="font-heading text-lg leading-snug">
                      <Link href={`${basePath}/${resource.slug}`} className="hover:underline">
                        {resource.title}
                      </Link>
                    </CardTitle>
                    {resource.description ? (
                      <CardDescription className="line-clamp-3">{resource.description}</CardDescription>
                    ) : null}
                  </CardHeader>

                  <CardContent className="text-xs text-muted-foreground">
                    {resource.publishedAt ? (
                      <span>
                        {t.published} {formatDate(resource.publishedAt, locale)}
                      </span>
                    ) : null}
                  </CardContent>

                  <CardFooter>
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`${basePath}/${resource.slug}`}>{dict.platform.common.view}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={page}
        pageCount={Math.ceil(total / pageSize)}
        buildHref={(target) => buildHref({ page: target })}
        labels={{
          previous: dict.common.previousPage,
          next: dict.common.nextPage,
          status: dict.common.pagination,
        }}
      />
    </>
  );
}

function chip(active: boolean): string {
  return [
    "inline-flex rounded-sm border px-3 py-1 text-sm transition-colors",
    active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-foreground/7",
  ].join(" ");
}
