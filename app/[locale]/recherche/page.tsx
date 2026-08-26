import type { Metadata } from "next";

import { ContactCTA } from "@/components/sections/ContactCTA";
import { ResearchCard } from "@/components/sections/ResearchCard";
import { MagneticTabs, type MagneticTabItem } from "@/components/ruixen/magnetic-tabs";
import { Container } from "@/components/ui/Container";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { createMetadata } from "@/lib/seo";
import { getResearch } from "@/lib/content";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recherche">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { pages } = await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "research",
    title: pages.research.metaTitle,
    description: pages.research.metaDescription,
    keywords: ["travaux de recherche", "mémoire", "publications", "méthodologie"],
  });
}

/**
 * Travaux de recherche publiés — MongoDB exclusivement.
 *
 * Regroupés par nature (mémoire, publication, projet…) dans Ruixen UI
 * « Magnetic Tabs » dès que deux catégories au moins sont représentées ;
 * un seul type de travaux publié n'a pas besoin d'onglets. Chaque entrée est
 * une carte Cult UI « Cutout Card ».
 *
 * Substitution documentée : la maquette de référence proposait Ruixen
 * « Case Study Tabs », mais ce composant est un bloc de témoignages clients
 * (logo de marque + citation) — inadapté à un index de travaux académiques.
 * « Magnetic Tabs » est le composant à onglets le plus proche dans le même
 * registre.
 */
export default async function RecherchePage() {
  const [locale, dict, research] = await Promise.all([getLocale(), getDictionary(), getResearch()]);
  const page = dict.pages.research;

  const categories = Array.from(
    new Set(research.map((entry) => entry.type).filter((type): type is string => Boolean(type))),
  );

  const cardLabels = { documents: page.sections.documents, publications: page.sections.publications };

  const grid = (entries: typeof research) => (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <li key={entry.id}>
          <ResearchCard entry={entry} labels={cardLabels} />
        </li>
      ))}
    </ul>
  );

  const tabs: MagneticTabItem[] = categories.map((category) => ({
    value: category,
    label: category,
    content: grid(research.filter((entry) => entry.type === category)),
  }));

  return (
    <Container>
      <PageHeader eyebrow={page.eyebrow} title={page.title} description={page.description} />

      <div className="border-t border-border py-14">
        {research.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{dict.common.empty}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : tabs.length >= 2 ? (
          <MagneticTabs items={tabs} defaultValue={tabs[0]?.value} />
        ) : (
          grid(research)
        )}
      </div>

      <ContactCTA locale={locale} dict={dict} />
    </Container>
  );
}
