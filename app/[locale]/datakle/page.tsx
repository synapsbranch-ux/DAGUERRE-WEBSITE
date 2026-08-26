import type { Metadata } from "next";
import Link from "next/link";

import { LiquidCtaLink } from "@/components/liquefy/LiquidCtaLink";
import { toServiceEntry } from "@/components/sections/DataklePreview";
import {
  EditorialBody,
  EditorialEmpty,
  EditorialHeader,
  EditorialItems,
  EditorialSections,
} from "@/components/sections/EditorialPages";
import { ServiceShowcase } from "@/components/sections/ServiceShowcase";
import { ServiceLedger } from "@/components/ruixen/service-ledger";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { getPage, getServices, getSocialLinks } from "@/lib/content";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { organizationSchema } from "@/lib/schema";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/datakle">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const [{ pages }, page] = await Promise.all([getDictionaryFor(locale), getPage("datakle", locale)]);

  return createMetadata({
    locale,
    routeKey: "datakle",
    title: page?.title || pages.datakle.metaTitle,
    description: page?.subtitle || pages.datakle.metaDescription,
    image: page?.heroImage,
    keywords: ["Datakle", "démocratisation de la donnée", "conseil data", "formation données"],
  });
}

/**
 * Page Datakle : mission, vision, valeurs, sections illustrées, puis les
 * services publiés — en registre (Ruixen « Service Ledger ») et, quand quatre
 * services au moins ont un visuel, en vitrine (Cult UI « Feature Carousel »).
 */
export default async function DataklePage() {
  const [locale, dict, page, services, socialLinks] = await Promise.all([
    getLocale(),
    getDictionary(),
    getPage("datakle"),
    getServices(),
    getSocialLinks(),
  ]);
  const labels = dict.pages.datakle;
  const home = dict.home.datakle;

  if (!page) {
    return (
      <Container>
        <EditorialEmpty title={labels.title} message={dict.pages.editorial.empty} />
      </Container>
    );
  }

  const cta = page.ctaHref
    ? { label: page.ctaLabel || labels.collaborateCta, url: page.ctaHref }
    : { label: labels.seeServices, url: href("services", locale) };

  return (
    <>
      <JsonLd data={organizationSchema(socialLinks.map((link) => link.url))} />
      <Container>
        <EditorialHeader
          eyebrow={labels.eyebrow}
          title={page.title}
          subtitle={page.subtitle}
          image={page.heroImage}
        />

        <EditorialBody
          body={page.body}
          className="prose max-w-[70ch] border-t border-border py-14 text-[15px] leading-7 text-foreground"
        />

        {page.mission || page.vision ? (
          <section className="grid gap-8 border-t border-border py-14 lg:grid-cols-2 lg:gap-16">
            {page.mission ? (
              <div>
                <h2 className="text-3xl">{labels.sections.mission}</h2>
                <p className="mt-4 max-w-[58ch] leading-7 text-muted-foreground">{page.mission}</p>
              </div>
            ) : null}
            {page.vision ? (
              <div>
                <h2 className="text-3xl">{labels.sections.vision}</h2>
                <p className="mt-4 max-w-[58ch] leading-7 text-muted-foreground">{page.vision}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        <EditorialItems title={labels.sections.valeurs} items={page.items} />
        <EditorialSections sections={page.sections} />

        {services.length > 0 ? (
          <section className="border-t border-border py-14">
            <div className="mb-8 flex flex-wrap items-end gap-6">
              <h2 className="flex-1 text-3xl">{labels.sections.services}</h2>
              <Button asChild variant="ghost">
                <Link href={href("services", locale)}>{labels.seeServices} →</Link>
              </Button>
            </div>
            <ServiceLedger
              title={home.title}
              description={home.lead}
              entries={services.map((service, index) => toServiceEntry(service, index, locale))}
              navLabel={labels.sections.services}
              className="py-0"
              frameClassName="max-w-none px-0 sm:px-0"
              contentClassName="max-w-none"
            />
          </section>
        ) : null}

        <ServiceShowcase
          services={services}
          title={home.title}
          description={home.lead}
          alt={labels.title}
        />

        <section className="border-t border-border py-14">
          <h2 className="text-3xl">{labels.collaborate}</h2>
          <p className="mt-3 max-w-[58ch] text-muted-foreground">{labels.collaborateBody}</p>
          {cta.url.startsWith("http") ? (
            <Button asChild size="cta" className="mt-6">
              <a href={cta.url} target="_blank" rel="noreferrer noopener">
                {cta.label}
              </a>
            </Button>
          ) : (
            <div className="mt-6">
              <LiquidCtaLink href={cta.url}>{cta.label}</LiquidCtaLink>
            </div>
          )}

          {/* Porte d'entrée directe vers l'estimation, sans passer par le contact. */}
          <Link
            href={href("quote", locale)}
            className="mt-6 inline-flex items-center rounded-md border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-foreground/5"
          >
            {dict.platform.quotes.title}
          </Link>
        </section>
      </Container>
    </>
  );
}
