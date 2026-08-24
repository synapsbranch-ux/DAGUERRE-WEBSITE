import type { Metadata } from "next";

import {
  EditorialBody,
  EditorialCertifications,
  EditorialEmpty,
  EditorialEntries,
  EditorialHeader,
  EditorialItems,
  EditorialTimeline,
} from "@/components/sections/EditorialPages";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { getPage, getProfile, getSkills, getSiteSettings } from "@/lib/content";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { profilePageSchema } from "@/lib/schema";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/cv">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const [{ pages }, page] = await Promise.all([getDictionaryFor(locale), getPage("cv", locale)]);

  return createMetadata({
    locale,
    routeKey: "cv",
    title: page?.title || pages.cv.metaTitle,
    description: page?.subtitle || pages.cv.metaDescription,
    image: page?.heroImage,
    type: "profile",
    keywords: ["curriculum vitae", "expériences", "formation", "certifications"],
  });
}

/**
 * CV : résumé, expériences, études, certifications et projets du CMS.
 *
 * Le document téléchargeable vient de la page CV ou, à défaut, du profil —
 * jamais d'un `/cv.pdf` codé en dur qui renverrait un 404 s'il n'existe pas.
 */
export default async function CvPage() {
  const [locale, dict, page, profile, skills, settings] = await Promise.all([
    getLocale(),
    getDictionary(),
    getPage("cv"),
    getProfile(),
    getSkills(),
    getSiteSettings(),
  ]);
  const labels = dict.pages.cv;

  if (!page) {
    return (
      <Container>
        <EditorialEmpty title={labels.title} message={dict.pages.editorial.empty} />
      </Container>
    );
  }

  const document = page.documentUrl ?? profile?.cvUrl ?? settings?.cvUrl;
  const certifications = page.certifications.length
    ? page.certifications
    : (profile?.certifications ?? []).map((name) => ({ name }));

  return (
    <Container>
      <JsonLd data={profilePageSchema(href("cv", locale), page.title)} />

      <EditorialHeader
        eyebrow={labels.eyebrow}
        title={page.title}
        subtitle={page.subtitle}
        image={page.heroImage}
      />

      {document ? (
        <div className="pb-10">
          <Button asChild size="cta">
            <a href={document} target="_blank" rel="noreferrer noopener">
              {dict.common.downloadCv}
            </a>
          </Button>
        </div>
      ) : null}

      <EditorialBody
        body={page.body}
        className="prose max-w-[70ch] border-t border-border py-14 text-[15px] leading-7 text-foreground"
      />

      <EditorialEntries title={labels.sections.experiences} entries={page.entries} />
      <EditorialTimeline title={labels.sections.formation} entries={page.timeline} />
      <EditorialCertifications title={labels.sections.certifications} certifications={certifications} />
      <EditorialItems title={labels.sections.projets} items={page.items} />

      {skills.length > 0 ? (
        <Section title={labels.sections.competences}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((group) => (
              <li key={group.slug} className="rounded-xl border border-border bg-white/45 p-4">
                <h3 className="text-sm font-bold">{group.name}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {group.skills.map((skill) => skill.name).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </Container>
  );
}
