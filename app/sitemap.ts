import type { MetadataRoute } from "next";

import {
  getBlogCategories,
  getBlogTags,
  getPosts,
  getProjects,
  getServices,
} from "@/lib/content";
import { locales, type Locale } from "@/lib/i18n";
import { href, routeKeys, routes, type RouteKey } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";

/**
 * Génère `/sitemap.xml`, bilingue.
 *
 * Deux points importants :
 *
 * 1. Ce fichier est un **Route Handler** : `next/root-params` n'y est pas
 *    disponible, il faut donc itérer explicitement sur `locales`.
 * 2. Chaque entrée porte ses `alternates.languages`, mécanisme documenté par
 *    Next pour déclarer les équivalences de langue à Google.
 */

type Entry = MetadataRoute.Sitemap[number];

/** Construit l'entrée d'une page dans toutes les locales. */
function localizedEntries(
  key: RouteKey,
  options: {
    lastModified?: Date;
    priority?: number;
    changeFrequency?: Entry["changeFrequency"];
    /** Slugs par locale, pour les contenus dont l'URL est traduite. */
    segments?: Partial<Record<Locale, string[]>>;
  } = {},
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    locales.map((locale) => [
      locale,
      absoluteUrl(href(key, locale, ...(options.segments?.[locale] ?? []))),
    ]),
  );

  return locales.map((locale) => ({
    url: absoluteUrl(href(key, locale, ...(options.segments?.[locale] ?? []))),
    lastModified: options.lastModified ?? new Date(),
    changeFrequency: options.changeFrequency ?? routes[key].changeFrequency,
    priority: options.priority ?? routes[key].priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries = routeKeys
    .filter((key) => routes[key].inSitemap)
    .flatMap((key) => localizedEntries(key, { lastModified: now }));

  const [projects, posts, categories, tags, services] = await Promise.all([
    getProjects(),
    getPosts(),
    getBlogCategories(),
    getBlogTags(),
    getServices(),
  ]);

  const projectEntries = projects.flatMap((project) =>
    localizedEntries("projects", {
      lastModified: now,
      priority: project.featured ? 0.8 : 0.6,
      changeFrequency: "yearly",
      segments: { fr: [project.slugs.fr], en: [project.slugs.en || project.slugs.fr] },
    }),
  );

  const postEntries = posts.flatMap((post) =>
    localizedEntries("blog", {
      lastModified: new Date(post.updatedAt ?? post.publishedAt),
      priority: post.featured ? 0.8 : 0.7,
      changeFrequency: "monthly",
      segments: { fr: [post.slugs.fr], en: [post.slugs.en || post.slugs.fr] },
    }),
  );

  const categoryEntries = categories.flatMap((category) =>
    localizedEntries("blogCategory", {
      lastModified: now,
      priority: 0.5,
      changeFrequency: "weekly",
      segments: { fr: [category.slug], en: [category.slug] },
    }),
  );

  const tagEntries = tags.flatMap((tag) =>
    localizedEntries("blogTag", {
      lastModified: now,
      priority: 0.4,
      changeFrequency: "weekly",
      segments: { fr: [tag.slug], en: [tag.slug] },
    }),
  );

  const serviceEntries = services.flatMap((service) =>
    localizedEntries("services", {
      lastModified: now,
      priority: 0.7,
      changeFrequency: "monthly",
      segments: { fr: [service.slugs.fr], en: [service.slugs.en || service.slugs.fr] },
    }),
  );

  return [
    ...staticEntries,
    ...projectEntries,
    ...postEntries,
    ...categoryEntries,
    ...tagEntries,
    ...serviceEntries,
  ];
}
