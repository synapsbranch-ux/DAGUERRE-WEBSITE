import type { Metadata } from "next";

import { ContactCTA } from "@/components/sections/ContactCTA";
import { SkillsExplorer } from "@/components/sections/SkillsExplorer";
import { Container } from "@/components/ui/Container";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { getSkills } from "@/lib/content";
import { isLocale } from "@/lib/i18n";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/competences">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { pages } = await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "skills",
    title: pages.skills.metaTitle,
    description: pages.skills.metaDescription,
    keywords: ["compétences", "Power BI", "Tableau", "ETL", "statistiques"],
  });
}

/**
 * Compétences.
 *
 * Ruixen UI « Magnetic Tabs » pour les catégories et « Tag Cloud Select »
 * pour l'exploration : choisir une compétence dans le nuage réduit les
 * onglets aux groupes qui la contiennent. Aucun pourcentage ni note de
 * maîtrise — seules les compétences mises en avant au CMS (`featured`)
 * ressortent, comme pastille plus grande dans le nuage.
 */
export default async function CompetencesPage() {
  const [locale, dict, skillGroups] = await Promise.all([getLocale(), getDictionary(), getSkills()]);
  const page = dict.pages.skills;

  return (
    <Container>
      <PageHeader eyebrow={page.eyebrow} title={page.title} description={page.description} />

      <Section title={page.categories}>
        {skillGroups.length > 0 ? (
          <SkillsExplorer
            groups={skillGroups}
            labels={{
              explore: page.explore,
              explorePlaceholder: page.explorePlaceholder,
              categories: page.categories,
            }}
          />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{dict.common.empty}</EmptyTitle>
              <EmptyDescription>{page.description}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </Section>

      <ContactCTA locale={locale} dict={dict} />
    </Container>
  );
}
