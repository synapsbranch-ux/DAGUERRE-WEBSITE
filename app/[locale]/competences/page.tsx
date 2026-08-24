import type { Metadata } from "next";

import { ContactCTA } from "@/components/sections/ContactCTA";
import { Container } from "@/components/ui/Container";
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
 * Catégories de compétences. Les intitulés sont des noms d'outils et de
 * disciplines : ils ne se traduisent pas.
 */
export default async function CompetencesPage() {
  const [locale, dict, skillGroups] = await Promise.all([getLocale(), getDictionary(), getSkills()]);
  const page = dict.pages.skills;

  return (
    <Container>
      <PageHeader eyebrow={page.eyebrow} title={page.title} description={page.description} />

      <Section title={page.categories}>
        {skillGroups.length ? <ul className="grid gap-px border border-border bg-border sm:grid-cols-2">
          {skillGroups.map((group) => (
            <li
              key={group.slug}
              id={group.slug}
              className="scroll-mt-24 bg-background p-6"
            >
              <h3 className="font-heading text-lg">{group.name}</h3>
              {group.description ? (
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{group.description}</p>
              ) : null}
              <ul className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {group.skills.map((skill) => (
                    <li
                      key={skill.name}
                      className={
                        skill.featured
                          ? "rounded-sm bg-[var(--copper-wash)] px-3 py-1 font-semibold text-foreground"
                          : "rounded-sm bg-foreground/6 px-3 py-1"
                      }
                    >
                      {skill.name}
                    </li>
                  ))}
                </ul>
            </li>
          ))}
        </ul> : <p className="rounded-md border border-border p-6 text-muted-foreground">{dict.common.empty}</p>}
      </Section>

      <ContactCTA locale={locale} dict={dict} />
    </Container>
  );
}
