import type { Metadata } from "next";
import Link from "next/link";

import { secondaryNavKeys } from "@/components/layout/Navigation";
import { SocialDock } from "@/components/sections/SocialDock";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { getSiteSettings, getSocialLinks } from "@/lib/content";
import { isLocale } from "@/lib/i18n";
import { href, routes } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/liens">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { pages } = await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "links",
    title: pages.links.metaTitle,
    description: pages.links.metaDescription,
    keywords: ["liens", "réseaux sociaux", "profils"],
  });
}

/**
 * Liens — Ruixen UI « Social Preview Dock » pour les réseaux sociaux publiés,
 * avec une fiche de survol générique (n'importe quelle plateforme, saisie
 * librement au CMS). Seuls les liens actifs apparaissent.
 */
export default async function LiensPage() {
  const [locale, dict, links, settings] = await Promise.all([
    getLocale(),
    getDictionary(),
    getSocialLinks(),
    getSiteSettings(),
  ]);
  const page = dict.pages.links;
  const email = settings?.email && !settings.email.includes("example.com") ? settings.email : undefined;

  return (
    <Container>
      <PageHeader eyebrow={page.eyebrow} title={page.title} description={page.description} />

      <div className="divide-y divide-border">
        <Section id="reseaux" title={page.networks} description={page.networksHint}>
          {links.length > 0 ? (
            <SocialDock links={links} email={email} />
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{page.networksEmpty}</EmptyTitle>
                <EmptyDescription>{page.networksHint}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </Section>

        <Section title={page.resources}>
          <ul className="flex flex-wrap gap-2.5">
            {secondaryNavKeys.map((key) => (
              <li key={key}>
                <Button asChild variant="secondary">
                  <Link href={href(key, locale)}>{routes[key].label[locale]}</Link>
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </Container>
  );
}
