import { revalidatePath } from "next/cache";
import { locales } from "@/lib/i18n";

/**
 * Invalidation ciblée du cache après une écriture depuis le CMS.
 *
 * ## Pourquoi les chemins sont toujours en français
 *
 * `proxy.ts` réécrit `/en/portfolio` vers la route interne `/en/realisations` :
 * c'est ce chemin **interne** qui identifie l'entrée de cache. On revalide donc
 * la forme française sous chaque locale, jamais le slug public traduit.
 *
 * ## Ancien et nouveau slug
 *
 * Renommer un contenu laisse une page en cache sous l'ancien chemin. Toute
 * modification doit donc passer `previousSlug` pour que l'ancienne URL cesse
 * de servir un contenu qui n'existe plus.
 */

type RevalidateOptions = {
  slug?: string;
  previousSlug?: string;
};

/** Chemins internes (sans préfixe de locale) touchés par chaque ressource. */
const listPaths: Record<string, string[]> = {
  posts: ["/blog"],
  projects: ["/realisations"],
  services: ["/datakle", "/datakle/services"],
  research: ["/recherche"],
  resources: ["/ressources"],
  skills: ["/competences"],
  social: ["/liens"],
  media: [],
  homeSections: [],
  settings: ["/cv", "/contact"],
  profile: ["/a-propos", "/cv"],
  about: ["/a-propos"],
  datakle: ["/datakle"],
  engagement: ["/engagement"],
  cv: ["/cv"],
};

/** Préfixe de la page de détail, quand la ressource en possède une. */
const detailPrefix: Record<string, string> = {
  posts: "/blog",
  projects: "/realisations",
  services: "/datakle/services",
  resources: "/ressources",
};

/** Ressources dont la modification change l'en-tête ou le pied de page. */
const layoutWide = new Set(["settings", "profile", "social"]);

/** Ressources listées dans le sitemap. */
const inSitemap = new Set(["posts", "projects", "services", "resources", "settings"]);

export function revalidateContent(kind: string, options: RevalidateOptions = {}) {
  const lists = listPaths[kind] ?? [];
  const prefix = detailPrefix[kind];
  const slugs = [options.slug, options.previousSlug].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  for (const locale of locales) {
    // L'accueil agrège réglages, profil, sections et contenus mis en avant :
    // toute écriture peut l'affecter.
    revalidatePath(`/${locale}`);

    for (const path of lists) revalidatePath(`/${locale}${path}`);
    if (prefix) for (const slug of new Set(slugs)) revalidatePath(`/${locale}${prefix}/${slug}`);

    // Les taxonomies sont des routes dynamiques : on invalide le gabarit.
    if (kind === "posts") {
      revalidatePath(`/${locale}/blog/categorie/[slug]`, "page");
      revalidatePath(`/${locale}/blog/tag/[slug]`, "page");
    }

    if (layoutWide.has(kind)) revalidatePath(`/${locale}`, "layout");
  }

  if (inSitemap.has(kind)) revalidatePath("/sitemap.xml");
}
