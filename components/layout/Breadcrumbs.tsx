"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import type { Locale } from "@/lib/i18n";
import { isKnownPath, labelForPath, routes } from "@/lib/routes";
import { breadcrumbSchema } from "@/lib/schema";

type Crumb = {
  name: string;
  path: string;
  /** Faux pour les segments intermédiaires qui ne correspondent à aucune page. */
  isLink: boolean;
};

function buildCrumbs(pathname: string, locale: Locale): Crumb[] {
  // Le premier segment est la locale : il n'apparaît pas dans le fil d'Ariane.
  const segments = pathname.split("/").filter(Boolean).slice(1);

  const crumbs: Crumb[] = [{ name: routes.home.label[locale], path: `/${locale}`, isLink: true }];

  segments.forEach((segment, index) => {
    const path = `/${locale}/${segments.slice(0, index + 1).join("/")}`;
    const isLast = index === segments.length - 1;

    crumbs.push({
      name: labelForPath(locale, path),
      path,
      isLink: !isLast && isKnownPath(locale, path),
    });
  });

  return crumbs;
}

type BreadcrumbsProps = {
  locale: Locale;
  label: string;
};

/**
 * Fil d'Ariane global, affiché sur toutes les pages sauf l'accueil.
 *
 * Il alimente le `BreadcrumbList` schema.org, que Google utilise pour afficher
 * le chemin du site dans ses résultats. Les segments intermédiaires qui ne
 * correspondent à aucune page réelle (`/fr/blog/categorie`) sont rendus en
 * texte, jamais en lien.
 */
export function Breadcrumbs({ locale, label }: BreadcrumbsProps) {
  const pathname = usePathname();

  if (!pathname || pathname === `/${locale}` || pathname === "/") return null;

  const crumbs = buildCrumbs(pathname, locale);

  return (
    <Container>
      <JsonLd data={breadcrumbSchema(crumbs.map(({ name, path }) => ({ name, path })))} />
      <nav aria-label={label} className="pt-6">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;

            return (
              <li key={crumb.path} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true">·</span> : null}
                {crumb.isLink ? (
                  <Link href={crumb.path} className="transition-colors hover:text-foreground">
                    {crumb.name}
                  </Link>
                ) : (
                  <span aria-current={isLast ? "page" : undefined}>{crumb.name}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </Container>
  );
}
