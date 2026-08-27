import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { LiquefyRoot } from "@/components/liquefy/LiquefyRoot";
import { JsonLd } from "@/components/seo/JsonLd";
import { getDictionaryFor } from "@/lib/dictionaries";
import { getSiteSettings, getSocialLinks } from "@/lib/content";
import { getPopulatedRoutes } from "@/lib/navigation";
import { fontVariables } from "@/lib/fonts";
import { isLocale, locales, ogLocales } from "@/lib/i18n";
import { alternatesFor } from "@/lib/routes";
import { personSchema, websiteSchema } from "@/lib/schema";
import { siteConfig, siteKeywords, siteUrl } from "@/lib/site";

/**
 * Layout racine — il vit sous `app/[locale]/` parce que la locale est un
 * **paramètre racine** (voir `next-root-params.md`). Le `<html lang>` en
 * découle, et tout Server Component peut lire la locale sans qu'on la lui
 * passe en propriété.
 */

/**
 * Les deux locales sont pré-générées.
 *
 * On ne met **pas** `dynamicParams = false` ici : la configuration de segment
 * est héritée par les segments enfants, ce qui ferait aussi tomber en 404
 * toutes les pages `[slug]` non pré-générées (articles, projets). Les locales
 * inconnues sont déjà écartées par le proxy puis par le garde `isLocale`
 * ci-dessous.
 */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionaryFor(locale);
  const languages = alternatesFor("home");

  return {
    // Rend les URLs relatives (canonical, Open Graph) absolues.
    metadataBase: new URL(siteUrl),
    title: {
      default: siteConfig.title,
      template: `%s — ${siteConfig.name}`,
    },
    description: siteConfig.description,
    keywords: siteKeywords,
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.name, url: siteUrl }],
    creator: siteConfig.name,
    publisher: siteConfig.name,
    category: "technology",
    alternates: {
      canonical: `/${locale}`,
      languages: { ...languages, "x-default": languages.fr },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: ogLocales[locale],
      siteName: siteConfig.name,
      url: `/${locale}`,
      title: siteConfig.title,
      description: siteConfig.description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: siteConfig.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.title,
      description: siteConfig.description,
      images: ["/opengraph-image"],
    },
    formatDetection: {
      telephone: false,
    },
    other: { "dictionary-locale": dict.common.language },
    // Renseigner NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION pour valider la propriété
    // du site dans Google Search Console.
    ...(siteConfig.googleSiteVerification
      ? { verification: { google: siteConfig.googleSiteVerification } }
      : {}),
  };
}

export const viewport: Viewport = {
  // Thème clair unique : la maquette n'a pas de mode sombre.
  themeColor: siteConfig.themeColor,
  colorScheme: "light",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, socialLinks, populated, settings] = await Promise.all([
    getDictionaryFor(locale),
    getSocialLinks(),
    getPopulatedRoutes(locale),
    getSiteSettings(),
  ]);

  return (
    <html lang={locale} className={`${fontVariables} h-full`}>
      <body className="min-h-full flex flex-col">
        <JsonLd
          data={[
            personSchema(socialLinks.map((link) => link.url), settings?.email ?? ""),
            websiteSchema(),
          ]}
        />
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:text-background"
        >
          {dict.common.skipToContent}
        </a>
        <LiquefyRoot>
          <Header locale={locale} dict={dict} populated={populated} />
          <Breadcrumbs locale={locale} label={dict.common.breadcrumb} />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <Footer locale={locale} dict={dict} populated={populated} />
        </LiquefyRoot>
      </body>
    </html>
  );
}
