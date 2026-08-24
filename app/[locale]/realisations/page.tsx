import type { Metadata } from "next";
import Link from "next/link";

import { ProjectCard } from "@/components/sections/ProjectCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Section } from "@/components/ui/Section";
import { getFeaturedProjects, getProjectFacets, getProjectsPage } from "@/lib/content";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { collectionPageSchema } from "@/lib/schema";
import { createMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

const PER_PAGE = 9;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/realisations">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { pages } = await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "projects",
    title: pages.projects.metaTitle,
    description: pages.projects.metaDescription,
    keywords: ["portfolio", "projets data", "études de cas", "tableaux de bord"],
  });
}

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

/**
 * Réalisations.
 *
 * Les filtres vivent dans l'URL (`?categorie=&technologie=&annee=&page=`) :
 * une sélection reste partageable et le rendu ne dépend d'aucun état client.
 */
export default async function RealisationsPage({
  searchParams,
}: PageProps<"/[locale]/realisations">) {
  const query = await searchParams;
  const category = first(query.categorie);
  const technology = first(query.technologie);
  const yearParam = Number(first(query.annee));
  const year = Number.isInteger(yearParam) && yearParam > 0 ? yearParam : undefined;
  const page = Math.max(1, Number(first(query.page)) || 1);

  const [locale, dict, results, featured, facets] = await Promise.all([
    getLocale(),
    getDictionary(),
    getProjectsPage({ category, technology, year, page, perPage: PER_PAGE }),
    getFeaturedProjects(),
    getProjectFacets(),
  ]);
  const labels = dict.pages.projects;
  const base = href("projects", locale);
  const filtered = Boolean(category || technology || year);

  /** Conserve les filtres actifs en changeant une seule dimension à la fois. */
  const buildHref = (patch: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { categorie: category, technologie: technology, annee: year, ...patch };
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== "" && value !== 0) params.set(key, String(value));
    }
    const search = params.toString();
    return search ? `${base}?${search}` : base;
  };

  return (
    <Container>
      <JsonLd
        data={collectionPageSchema({
          path: base,
          title: labels.metaTitle,
          description: labels.metaDescription,
          items: results.items.map((project) => href("projects", locale, project.slug)),
        })}
      />

      <PageHeader eyebrow={labels.eyebrow} title={labels.title} description={labels.description} />

      <div className="divide-y divide-border">
        {facets.categories.length > 0 || facets.technologies.length > 0 || facets.years.length > 0 ? (
          <Section title={labels.filters} description={labels.filtersHint}>
            <div className="grid gap-5">
              <FilterRow
                label={labels.categories}
                values={facets.categories}
                active={category}
                allLabel={dict.common.allFilter}
                buildHref={(value) => buildHref({ categorie: value, page: undefined })}
              />
              <FilterRow
                label={labels.technologies}
                values={facets.technologies}
                active={technology}
                allLabel={dict.common.allFilter}
                buildHref={(value) => buildHref({ technologie: value, page: undefined })}
              />
              <FilterRow
                label={labels.year}
                values={facets.years.map(String)}
                active={year ? String(year) : ""}
                allLabel={dict.common.allFilter}
                buildHref={(value) => buildHref({ annee: value, page: undefined })}
              />
            </div>

            {filtered ? (
              <p className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>
                  {results.total} {dict.common.resultCount}
                </span>
                <Link href={base} className="underline underline-offset-4 hover:text-foreground">
                  {dict.common.resetFilters}
                </Link>
              </p>
            ) : null}
          </Section>
        ) : null}

        {/* La mise en avant ne s'affiche que sur la vue complète, non filtrée. */}
        {!filtered && page === 1 ? (
          <Section title={labels.featured} description={labels.featuredHint}>
            {featured.length > 0 ? (
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((project) => (
                  <li key={project.slug}>
                    <ProjectCard project={project} locale={locale} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{labels.emptyFeatured}</p>
            )}
          </Section>
        ) : null}

        <Section title={labels.all} description={labels.allHint}>
          {results.items.length > 0 ? (
            <>
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {results.items.map((project) => (
                  <li key={project.slug}>
                    <ProjectCard project={project} locale={locale} />
                  </li>
                ))}
              </ul>
              <Pagination
                page={results.page}
                pageCount={results.pageCount}
                buildHref={(target) => buildHref({ page: target > 1 ? target : undefined })}
                labels={{
                  previous: dict.common.previousPage,
                  next: dict.common.nextPage,
                  status: dict.common.pagination,
                }}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{labels.empty}</p>
          )}
        </Section>
      </div>
    </Container>
  );
}

/** Une dimension de filtre : « Tous » puis chaque valeur disponible. */
function FilterRow({
  label,
  values,
  active,
  allLabel,
  buildHref,
}: {
  label: string;
  values: string[];
  active: string;
  allLabel: string;
  buildHref: (value: string | undefined) => string;
}) {
  if (values.length === 0) return null;

  const chip = (selected: boolean) =>
    cn(
      "inline-flex rounded-sm border px-3 py-1 text-sm transition-colors",
      selected
        ? "border-[var(--copper)] bg-[var(--copper-wash)] font-semibold"
        : "border-border hover:bg-foreground/7",
    );

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        <li>
          <Link href={buildHref(undefined)} className={chip(!active)} aria-current={!active ? "true" : undefined}>
            {allLabel}
          </Link>
        </li>
        {values.map((value) => (
          <li key={value}>
            <Link
              href={buildHref(value)}
              className={chip(active === value)}
              aria-current={active === value ? "true" : undefined}
            >
              {value}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

