"use client";

import Link from "next/link";
import * as React from "react";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import type { Locale } from "@/lib/i18n";
import { isKnownPath, labelForPath, publicPathname, routes } from "@/lib/routes";
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
 * Fil d'Ariane global — primitive shadcn — affiché sur toutes les pages sauf
 * l'accueil.
 *
 * Il alimente le `BreadcrumbList` schema.org, que Google utilise pour afficher
 * le chemin du site dans ses résultats. Les segments intermédiaires qui ne
 * correspondent à aucune page réelle (`/fr/blog/categorie`) sont rendus en
 * texte, jamais en lien.
 */
export function Breadcrumbs({ locale, label }: BreadcrumbsProps) {
  /*
   * Le chemin est normalisé en sa forme publique avant tout usage : pendant le
   * rendu serveur, `usePathname()` renvoie le chemin **interne** issu de la
   * réécriture du proxy (`/en/realisations`), alors que le navigateur voit
   * `/en/portfolio`. Sans cette normalisation, les libellés diffèrent de part
   * et d'autre et React signale une erreur d'hydratation.
   */
  const raw = usePathname();
  const pathname = raw ? publicPathname(locale, raw) : raw;

  if (!pathname || pathname === `/${locale}` || pathname === "/") return null;

  const crumbs = buildCrumbs(pathname, locale);

  return (
    <Container>
      <JsonLd data={breadcrumbSchema(crumbs.map(({ name, path }) => ({ name, path })))} />
      <Breadcrumb aria-label={label} className="pt-6 text-[11px] uppercase tracking-[0.1em]">
        <BreadcrumbList className="gap-x-2 gap-y-1 text-muted-foreground">
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;

            return (
              <React.Fragment key={crumb.path}>
                {index > 0 ? <BreadcrumbSeparator className="[&>svg]:size-3" /> : null}
                <BreadcrumbItem>
                  {crumb.isLink ? (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.path} className="hover:text-foreground">
                        {crumb.name}
                      </Link>
                    </BreadcrumbLink>
                  ) : isLast ? (
                    <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                  ) : (
                    <span className="text-muted-foreground">{crumb.name}</span>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </Container>
  );
}
