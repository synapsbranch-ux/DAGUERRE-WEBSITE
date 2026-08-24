import type { Metadata } from "next";

import {
  EditorialBody,
  EditorialEmpty,
  EditorialGallery,
  EditorialHeader,
  EditorialItems,
  EditorialSections,
} from "@/components/sections/EditorialPages";
import { Container } from "@/components/ui/Container";
import { getPage } from "@/lib/content";
import { getDictionary, getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/engagement">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const [{ pages }, page] = await Promise.all([
    getDictionaryFor(locale),
    getPage("engagement", locale),
  ]);

  return createMetadata({
    locale,
    routeKey: "engagement",
    title: page?.title || pages.engagement.metaTitle,
    description: page?.subtitle || pages.engagement.metaDescription,
    image: page?.heroImage,
    keywords: ["engagement social", "développement Haïti", "mentorat", "éducation"],
  });
}

/** Engagement : contenu, initiatives, valeurs et médias, tous issus du CMS. */
export default async function EngagementPage() {
  const [dict, page] = await Promise.all([getDictionary(), getPage("engagement")]);
  const labels = dict.pages.engagement;

  if (!page) {
    return (
      <Container>
        <EditorialEmpty title={labels.title} message={dict.pages.editorial.empty} />
      </Container>
    );
  }

  return (
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

      <EditorialItems title={labels.sections.initiatives} items={page.items} />
      <EditorialSections sections={page.sections} />
      <EditorialGallery title={dict.pages.editorial.gallery} images={page.media} />
    </Container>
  );
}
