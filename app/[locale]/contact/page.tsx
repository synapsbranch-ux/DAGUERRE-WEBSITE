import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/sections/ContactForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { getSiteSettings, getSocialLinks } from "@/lib/content";
import { isLocale } from "@/lib/i18n";
import { contactPageSchema } from "@/lib/schema";
import { href } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { pages } = await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "contact",
    title: pages.contact.metaTitle,
    description: pages.contact.metaDescription,
    keywords: ["contact", "collaboration", "mission freelance", "consultation données"],
  });
}

export default async function ContactPage() {
  const [locale, dict, settings, socialLinks] = await Promise.all([
    getLocale(),
    getDictionary(),
    getSiteSettings(),
    getSocialLinks(),
  ]);
  const page = dict.pages.contact;

  /**
   * Coordonnées issues des Paramètres. Une valeur non renseignée n'est pas
   * affichée du tout : mieux vaut une colonne courte qu'un numéro fictif.
   */
  const place = [settings?.city, settings?.region, settings?.country].filter(Boolean).join(", ");
  const details = [
    settings?.email
      ? { label: page.email, value: settings.email, href: `mailto:${settings.email}` }
      : null,
    settings?.phone
      ? { label: page.phone, value: settings.phone, href: `tel:${settings.phone.replace(/\s/g, "")}` }
      : null,
    place ? { label: page.basedIn, value: place, href: undefined } : null,
    ...socialLinks.slice(0, 3).map((link) => ({
      label: link.platform,
      value: link.label,
      href: link.url,
    })),
  ].filter((item): item is { label: string; value: string; href: string | undefined } => item !== null);

  return (
    <Container>
      <JsonLd data={contactPageSchema()} />
      <PageHeader eyebrow={page.eyebrow} title={page.title} description={page.description}>
        {/*
          Un besoin déjà cadré mérite le formulaire de devis plutôt qu'un
          message libre : les réponses structurées permettent une estimation,
          là où un courriel demande trois allers-retours.
        */}
        <Link
          href={href("quote", locale)}
          className="inline-flex items-center rounded-md border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-foreground/5"
        >
          {dict.platform.quotes.title}
        </Link>
      </PageHeader>

      <div className="grid gap-14 py-14 sm:py-20 lg:grid-cols-[1fr_460px] lg:gap-18">
        <div>
          {details.length > 0 ? (
            <dl className="grid grid-cols-1 gap-x-11 gap-y-5 border-t border-border pt-8 text-sm sm:grid-cols-2">
              {details.map((item) => (
                <div key={`${item.label}-${item.value}`}>
                  <dt className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd>
                    {item.href ? (
                      <a
                        href={item.href}
                        {...(item.href.startsWith("http")
                          ? { target: "_blank", rel: "noreferrer noopener" }
                          : {})}
                        className="underline-offset-4 hover:underline"
                      >
                        {item.value}
                      </a>
                    ) : (
                      item.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {settings?.calendlyUrl ? (
            <div className="mt-10 border-t border-border pt-8">
              <h2 className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {page.booking}
              </h2>
              <a
                href={settings.calendlyUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-block text-sm underline-offset-4 hover:underline"
              >
                {page.booking} →
              </a>
            </div>
          ) : null}
        </div>

        <ContactForm dict={dict} />
      </div>
    </Container>
  );
}
