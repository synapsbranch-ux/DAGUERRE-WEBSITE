import type { Metadata } from "next";

import {
  EditorialBody,
  EditorialEmpty,
  EditorialGallery,
  EditorialHeader,
  EditorialSections,
  EditorialTimeline,
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
      <Container>
        <EditorialHeader
          eyebrow={labels.eyebrow}
          title={page.title}
          subtitle={page.subtitle}
          image={page.heroImage ?? profile?.portrait}
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
