import type { Metadata } from "next";
import Link from "next/link";

import { ContactCTA } from "@/components/sections/ContactCTA";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getServices } from "@/lib/content";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { collectionPageSchema } from "@/lib/schema";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/datakle/services">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { pages } = await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "services",
    title: pages.services.metaTitle,
    description: pages.services.metaDescription,
    keywords: ["services data", "conseil business intelligence", "formation données"],
  });
}

/** Catalogue des services publiés, ordonné par le champ `order` du CMS. */
export default async function DatakleServicesPage() {
  const [locale, dict, services] = await Promise.all([
    getLocale(),
    getDictionary(),
    getServices(),
  ]);
  const page = dict.pages.services;

  return (
    <Container>
      <JsonLd
        data={collectionPageSchema({
          path: href("services", locale),
          title: page.metaTitle,
          description: page.metaDescription,
          items: services.map((service) => href("services", locale, service.slug)),
        })}
      />

      <PageHeader eyebrow={page.eyebrow} title={page.title} description={page.description} />

      <div className="divide-y divide-border">
        <Section title={page.catalogue} description={page.catalogueHint}>
          {services.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {services.map((service) => (
                <li key={service.slug}>
                  <article className="flex h-full flex-col rounded-2xl border border-border bg-white/45 p-6 transition-colors hover:border-[var(--copper)]/55">
                    <div className="flex items-start gap-2">
                      <h3 className="flex-1 text-xl">
                        <Link
                          href={href("services", locale, service.slug)}
                          className="transition-colors hover:text-primary"
                        >
                          {service.title}
                        </Link>
                      </h3>
                      {service.featured ? <Badge variant="secondary">★</Badge> : null}
                    </div>

                    {service.summary ? (
                      <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                        {service.summary}
                      </p>
                    ) : null}

                    {service.deliverables.length > 0 ? (
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {service.deliverables.slice(0, 4).map((deliverable) => (
                          <li key={deliverable}>
                            <Badge variant="outline">{deliverable}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{page.empty}</p>
          )}
        </Section>

        <ContactCTA locale={locale} dict={dict} />
      </div>
    </Container>
  );
}
