import type { Metadata } from "next";

import { defaultLocale, ogLocales, type Locale } from "@/lib/i18n";
import { alternatesFor, href, type RouteKey } from "@/lib/routes";
import { siteConfig, siteKeywords } from "@/lib/site";
import { siteAssets } from "@/lib/media/assets";

/**
 * Image de partage par défaut.
 *
 * L'import statique expose un chemin haché servi par Next ; `metadataBase`,
 * défini dans le layout racine, le rend absolu dans les balises Open Graph.
 */
const defaultOgImage = siteAssets.openGraph.image.src;

type CreateMetadataInput = {
  locale: Locale;
  /** Clé de la table des routes — garantit des URL cohérentes en FR et EN. */
  routeKey: RouteKey;
  /**
   * Segments dynamiques par locale, pour les contenus dont le slug est traduit
   * (articles, projets, services). Sans cela, `hreflang` supposerait à tort
   * que le slug est identique dans les deux langues.
   */
  segments?: Partial<Record<Locale, string[]>>;
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article" | "profile";
  /** Mots-clés spécifiques à la page, ajoutés aux mots-clés du site. */
  keywords?: string[];
  /** Ignore le gabarit de titre du layout racine (`%s — Nom du site`). */
  absoluteTitle?: boolean;
  /** Retire la page de l'index des moteurs (pages utilitaires, 404…). */
  noIndex?: boolean;
  /** Métadonnées d'article : dates ISO, rubrique, tags. */
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
  };
};

/**
 * Fabrique l'objet `Metadata` natif de Next.js : titre, description, canonical,
 * `hreflang`, Open Graph, Twitter et directives robots.
 *
 * Les URL viennent toujours de la table des routes, jamais d'une
 * concaténation manuelle — c'est ce qui garantit que la version anglaise
 * pointe vers `/en/portfolio` et non vers `/en/realisations`.
 */
export function createMetadata({
  locale,
  routeKey,
  segments,
  title,
  description,
  image,
  type = "website",
  keywords,
  absoluteTitle = false,
  noIndex = false,
  article,
}: CreateMetadataInput): Metadata {
  const url = href(routeKey, locale, ...(segments?.[locale] ?? []));
  const languages = alternatesFor(routeKey, segments);

  // Une page qui déclare son propre bloc `openGraph` écrase celui du layout,
  // y compris l'image issue du fichier `app/opengraph-image.tsx`. On la
  // référence donc explicitement pour que chaque page ait un aperçu au partage.
  const images = [
    image
      ? { url: image, alt: title }
      : { url: defaultOgImage, width: 1200, height: 630, alt: siteConfig.title },
  ];

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords: keywords ? [...keywords, ...siteKeywords] : siteKeywords,
    alternates: {
      canonical: url,
      languages: { ...languages, "x-default": languages[defaultLocale] },
    },
    robots: noIndex
      ? // `follow` reste actif : la page n'est pas indexée, mais les liens
        // qu'elle contient sont suivis.
        { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            // Autorise Google à afficher de grandes vignettes et des extraits
            // complets : meilleure apparence dans les résultats de recherche.
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: type === "profile" ? "profile" : type,
      url,
      title,
      description,
      siteName: siteConfig.name,
      locale: ogLocales[locale],
      images,
      ...(type === "article" && article
        ? {
            publishedTime: article.publishedTime,
            modifiedTime: article.modifiedTime,
            section: article.section,
            tags: article.tags,
            authors: [siteConfig.name],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image ?? defaultOgImage],
    },
  };
}
