import type { Metadata } from "next";

import { toServiceEntry } from "@/components/sections/DataklePreview";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { ServiceLedger } from "@/components/ruixen/service-ledger";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/PageHeader";
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

/**
 * Catalogue des services publiés.
 *
 * Ruixen UI « Service Ledger », le même composant qui déroule les services
 * sur l'accueil et sur la page Datakle : la bande à onglets suit la lecture
 * et chaque service développe son résumé et ses livrables. Sans service
 * publié, un état vide de registre — jamais un cadre cassé.
 */
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
        {services.length > 0 ? (
          <ServiceLedger
            title={page.catalogue}
            description={page.catalogueHint}
            entries={services.map((service, index) => toServiceEntry(service, index, locale))}
            navLabel={page.catalogue}
          />
        ) : (
          <div className="py-14">
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{page.empty}</EmptyTitle>
                <EmptyDescription>{page.catalogueHint}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        )}

        <ContactCTA locale={locale} dict={dict} />
      </div>
    </Container>
  );
}
