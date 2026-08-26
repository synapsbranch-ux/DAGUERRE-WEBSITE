import type { Metadata } from "next";

import { ChapterRail } from "@/components/sections/ChapterRail";
import {
  EditorialBody,
  EditorialEmpty,
  EditorialGallery,
  EditorialHeader,
  EditorialSections,
  EditorialTimeline,
  sectionAnchorId,
} from "@/components/sections/EditorialPages";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { getPage, getProfile } from "@/lib/content";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { profilePageSchema } from "@/lib/schema";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/a-propos">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const [{ pages }, page] = await Promise.all([getDictionaryFor(locale), getPage("about", locale)]);

  return createMetadata({
    locale,
    routeKey: "about",
    title: page?.title || pages.about.metaTitle,
    description: page?.subtitle || pages.about.metaDescription,
    image: page?.heroImage,
    type: "profile",
    keywords: ["parcours", "biographie", "ingénieur agronome", "MBA analytique d'affaires"],
  });
}

/**
 * « À propos » — récit, frise chronologique, sections et images du CMS.
 *
 * Les chapitres saisis au CMS alimentent le rail Ruixen « Chapter Scrubber »,
 * qui suit la lecture sur grand écran. La photographie d'ouverture porte le
 * traitement tramé de Cult UI, comme le bandeau d'accueil — le motif revient,
 * mais jamais sur toutes les images d'une même page.
 *
 * Aucun texte n'est codé ici : la page est vide tant que le contenu n'a pas
 * été saisi dans le tableau de bord.
 */
export default async function AProposPage() {
  const [locale, dict, page, profile] = await Promise.all([
    getLocale(),
    getDictionary(),
    getPage("about"),
    getProfile(),
  ]);
  const labels = dict.pages.about;

  if (!page) {
    return (
      <Container>
        <EditorialEmpty title={labels.title} message={dict.pages.editorial.empty} />
      </Container>
    );
  }

  return (
    <>
      <JsonLd data={profilePageSchema(href("about", locale), page.title)} />

      <ChapterRail
        label={labels.title}
        chapters={page.sections.map((section, index) => ({
          id: sectionAnchorId(section.title, index),
          title: section.title,
          meta: String(index + 1).padStart(2, "0"),
        }))}
      />

      <Container>
        <EditorialHeader
          eyebrow={labels.eyebrow}
          title={page.title}
          subtitle={page.subtitle}
          image={page.heroImage ?? profile?.portrait}
          dithered
        />

        <EditorialBody
          body={page.body}
          className="prose max-w-[70ch] border-t border-border py-14 text-[15px] leading-7 text-foreground"
        />

        <EditorialTimeline title={dict.pages.editorial.timeline} entries={page.timeline} />
        <EditorialSections sections={page.sections} />
        <EditorialGallery title={dict.pages.editorial.gallery} images={page.media} />
      </Container>
    </>
  );
}
