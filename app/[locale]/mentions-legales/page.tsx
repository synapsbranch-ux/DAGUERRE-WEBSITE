import type { Metadata } from "next";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionOutline } from "@/components/ui/SectionOutline";
import { getDictionary, getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/mentions-legales">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { pages } = await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "legal",
    title: pages.legal.metaTitle,
    description: pages.legal.metaDescription,
  });
}

export default async function MentionsLegalesPage() {
  const dict = await getDictionary();
  const page = dict.pages.legal;

  return (
    <Container>
      <PageHeader eyebrow={page.eyebrow} title={page.title} description={page.description} />
      <SectionOutline sections={page.sections} emptyLabel={dict.common.comingSoon} />
    </Container>
  );
}
