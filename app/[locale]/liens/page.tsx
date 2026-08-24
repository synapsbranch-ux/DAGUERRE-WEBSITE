import type { Metadata } from "next";
import Link from "next/link";

import { secondaryNavKeys } from "@/components/layout/Navigation";
import { SocialLinks } from "@/components/sections/SocialLinks";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
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

export default async function LiensPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const page = dict.pages.links;

  return (
    <Container>
      <PageHeader eyebrow={page.eyebrow} title={page.title} description={page.description} />

      <div className="divide-y divide-border">
        <SocialLinks
          title={page.networks}
          description={page.networksHint}
          emptyLabel={page.networksEmpty}
        />

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
