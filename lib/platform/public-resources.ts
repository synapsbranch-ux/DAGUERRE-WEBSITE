import { ContentResourceModel } from "@/lib/db/models/platform";
import { tryConnectToDatabase } from "@/lib/db/client";

/**
 * Slugs des ressources **publiques**, pour le plan de site.
 *
 * La condition de portée est dans la requête : une ressource réservée aux
 * comptes n'apparaît jamais dans `sitemap.xml`, où elle serait une invitation
 * à venir buter sur une page de connexion.
 *
 * La base injoignable ne fait pas échouer le plan de site : il est simplement
 * servi sans ces entrées.
 */
export type PublicResourceSlug = { fr: string; en: string; updatedAt: Date };

export async function listPublicResourceSlugs(): Promise<PublicResourceSlug[]> {
  if (!(await tryConnectToDatabase())) return [];

  try {
    const docs = (await ContentResourceModel.find({
      status: "published",
      visibility: "public",
      publishedAt: { $lte: new Date() },
    })
      .select("slug updatedAt")
      .sort({ publishedAt: -1 })
      .limit(2000)
      .lean()) as Record<string, unknown>[];

    return docs.map((doc) => {
      const slug = (doc.slug ?? {}) as { fr?: string; en?: string };
      return {
        fr: String(slug.fr ?? ""),
        en: String(slug.en ?? ""),
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : new Date(),
      };
    }).filter((entry) => entry.fr);
  } catch (error) {
    console.error("[sitemap] ressources illisibles :", error);
    return [];
  }
}
