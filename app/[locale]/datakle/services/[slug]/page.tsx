import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { EditorialImage } from "@/components/motion/EditorialImage";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getServiceBySlug, getServices } from "@/lib/content";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { serviceSchema } from "@/lib/schema";
import { createMetadata } from "@/lib/seo";

/**
 * Pré-génère une page par service publié. La locale est déjà fixée par le
 * `generateStaticParams` du layout racine : on ne retourne que `slug`.
 */
export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/datakle/services/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const service = await getServiceBySlug(slug, locale);
  if (!service) return {};

  await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "services",
    segments: { fr: [service.slugs.fr], en: [service.slugs.en || service.slugs.fr] },
    title: service.seoTitle || service.title,
    description: service.seoDescription || service.summary,
    image: service.ogImage ?? service.image,
  });
}

export default async function DatakleServicePage({
  params,
}: PageProps<"/[locale]/datakle/services/[slug]">) {
  const { slug } = await params;
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const service = await getServiceBySlug(slug, locale);

  // Un service en brouillon ou archivé n'est pas consultable publiquement.
  if (!service) notFound();

  const detail = dict.pages.services.detail;

  return (
    <Container>
      <JsonLd data={serviceSchema(service)} />

      <PageHeader eyebrow={detail.eyebrow} title={service.title} description={service.summary} />

      {service.image ? (
        <EditorialImage
          src={service.image}
          alt=""
          className="aspect-[21/9] min-h-0 rounded-2xl border-0"
          sizes="(max-width: 1024px) 100vw, 1180px"
          priority
        />
      ) : null}

      <div className="divide-y divide-border">
        {service.body ? (
          <Section title={detail.sections.presentation}>
            <div className="prose max-w-3xl text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                {service.body}
              </ReactMarkdown>
            </div>
          </Section>
        ) : null}

        {service.features.length > 0 ? (
          <Section title={detail.sections.contenu}>
            <ul className="grid max-w-3xl gap-2.5">
              {service.features.map((feature) => (
                <li key={feature} className="flex gap-3 text-[15px] leading-7">
                  <span aria-hidden="true" className="mt-3 h-px w-4 shrink-0 bg-[var(--copper)]" />
                  {feature}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {service.deliverables.length > 0 ? (
          <Section title={detail.sections.livrables}>
            <ul className="grid max-w-3xl gap-2.5">
              {service.deliverables.map((deliverable) => (
                <li key={deliverable} className="flex gap-3 text-[15px] leading-7">
                  <span aria-hidden="true" className="mt-3 h-px w-4 shrink-0 bg-[var(--copper)]" />
                  {deliverable}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>

      <ContactCTA locale={locale} dict={dict} />
    </Container>
  );
}
