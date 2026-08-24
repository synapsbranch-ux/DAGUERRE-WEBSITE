import {
  absoluteUrl,
  organization,
  person,
  siteConfig,
  siteUrl,
} from "@/lib/site";
import type { Post, Project, Service } from "@/lib/types";

/**
 * Constructeurs de données structurées schema.org (JSON-LD).
 *
 * Elles permettent à Google de comprendre la nature du site et d'afficher des
 * résultats enrichis (fil d'Ariane, articles, profil). Testables sur
 * https://search.google.com/test/rich-results
 */

export type JsonLdObject = Record<string, unknown>;

/** Identifiants stables, pour que les entités se référencent entre elles. */
const personId = `${siteUrl}/#person`;
const websiteId = `${siteUrl}/#website`;
const organizationId = `${siteUrl}/datakle#organization`;

/**
 * Profils officiels (`sameAs`).
 *
 * Ils viennent de la collection `SocialLink` : déclarer ici une URL codée en
 * dur ferait mentir Google dès qu'un profil change dans le CMS.
 */
export function personSchema(sameAs: string[] = []): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personId,
    name: person.name,
    url: siteUrl,
    jobTitle: person.jobTitle,
    description: person.description,
    knowsAbout: person.knowsAbout,
    email: `mailto:${siteConfig.email}`,
    sameAs,
    address: {
      "@type": "PostalAddress",
      addressLocality: siteConfig.location.city,
      addressRegion: siteConfig.location.region,
      addressCountry: siteConfig.location.country,
    },
  };
}

export function websiteSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId,
    name: siteConfig.name,
    url: siteUrl,
    description: siteConfig.description,
    inLanguage: siteConfig.lang,
    publisher: { "@id": personId },
  };
}

export function organizationSchema(sameAs: string[] = []): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId,
    name: organization.name,
    url: organization.url,
    description: organization.description,
    founder: { "@id": personId },
    sameAs,
  };
}

export type BreadcrumbItem = {
  name: string;
  /** Chemin interne, ex. "/blog". */
  path: string;
};

export function breadcrumbSchema(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function profilePageSchema(path: string, title: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: title,
    url: absoluteUrl(path),
    inLanguage: siteConfig.lang,
    mainEntity: { "@id": personId },
    isPartOf: { "@id": websiteId },
  };
}

export function collectionPageSchema({
  path,
  title,
  description,
  items,
}: {
  path: string;
  title: string;
  description: string;
  /** Chemins internes des éléments listés. */
  items?: string[];
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: absoluteUrl(path),
    inLanguage: siteConfig.lang,
    isPartOf: { "@id": websiteId },
    ...(items && items.length > 0
      ? {
          mainEntity: {
            "@type": "ItemList",
            itemListElement: items.map((item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: absoluteUrl(item),
            })),
          },
        }
      : {}),
  };
}

export function blogSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `Blog — ${siteConfig.name}`,
    url: absoluteUrl("/blog"),
    description: "Articles et analyses sur la donnée, la gestion de projet et la recherche.",
    inLanguage: siteConfig.lang,
    author: { "@id": personId },
    publisher: { "@id": personId },
    isPartOf: { "@id": websiteId },
  };
}

export function blogPostingSchema(post: Post): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    url: absoluteUrl(`/blog/${post.slug}`),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    inLanguage: siteConfig.lang,
    author: { "@id": personId },
    publisher: { "@id": personId },
    ...(post.image ? { image: absoluteUrl(post.image) } : {}),
    keywords: [...post.categories, ...post.tags].join(", "),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/blog/${post.slug}`),
    },
  };
}

export function projectSchema(project: Project): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    url: absoluteUrl(`/realisations/${project.slug}`),
    dateCreated: String(project.year),
    inLanguage: siteConfig.lang,
    creator: { "@id": personId },
    keywords: [...project.categories, ...project.technologies].join(", "),
    ...(project.image ? { image: absoluteUrl(project.image) } : {}),
  };
}

export function serviceSchema(service: Service): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.summary,
    url: absoluteUrl(`/datakle/services/${service.slug}`),
    provider: { "@id": organizationId },
    areaServed: ["CA", "HT"],
  };
}

export function contactPageSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact — ${siteConfig.name}`,
    url: absoluteUrl("/contact"),
    inLanguage: siteConfig.lang,
    isPartOf: { "@id": websiteId },
    mainEntity: { "@id": personId },
  };
}
