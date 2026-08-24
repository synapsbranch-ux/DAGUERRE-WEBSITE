import type { Metadata } from "next";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionOutline } from "@/components/ui/SectionOutline";
import { getDictionary, getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/politique-de-confidentialite">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { pages } = await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "privacy",
    title: pages.privacy.metaTitle,
    description: pages.privacy.metaDescription,
  });
}

export default async function PolitiqueDeConfidentialitePage() {
  const dict = await getDictionary();
  const page = dict.pages.privacy;

  return (
    <Container>
      <PageHeader eyebrow={page.eyebrow} title={page.title} description={page.description} />
      <SectionOutline sections={page.sections} emptyLabel={dict.common.comingSoon} />
    </Container>
  );
}
