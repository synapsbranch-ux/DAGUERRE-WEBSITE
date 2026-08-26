import type { Metadata } from "next";

import { ContactCTA } from "@/components/sections/ContactCTA";
import {
  EditorialBody,
  EditorialEmpty,
  EditorialHeader,
  EditorialItems,
  EditorialSections,
} from "@/components/sections/EditorialPages";
import { EngagementGallery } from "@/components/sections/EngagementGallery";
import { Container } from "@/components/ui/Container";
import { getPage } from "@/lib/content";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
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

/**
 * Engagement : mission, initiatives, valeurs, récit photographique et appel
 * à l'action — tout issu du CMS.
 *
 * Le récit photographique passe par Ruixen UI « Scroll Image Tunnel »
 * (`EngagementGallery`) plutôt que la grille éditoriale partagée : c'est la
 * seule page où la mégaconsigne demande spécifiquement ce traitement.
 */
export default async function EngagementPage() {
  const [locale, dict, page] = await Promise.all([getLocale(), getDictionary(), getPage("engagement")]);
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

      <EngagementGallery images={page.media} hint={labels.galleryHint} />

      <ContactCTA locale={locale} dict={dict} />
    </Container>
  );
}
