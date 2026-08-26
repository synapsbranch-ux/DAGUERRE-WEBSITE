import { tryConnectToDatabase } from "@/lib/db/client";
import { ContentResourceModel } from "@/lib/db/models/platform";
import {
  getPage,
  getPosts,
  getProjects,
  getResearch,
  getServices,
  getSkills,
  getSocialLinks,
} from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import type { RouteKey } from "@/lib/routes";

/**
 * Navigation sensible au contenu.
 *
 * Une rubrique sans contenu publié n'est **pas** supprimée : sa route existe
 * toujours, elle reste indexable et le tableau de bord continue de l'alimenter.
 * Elle est seulement retirée des barres de navigation, pour ne pas conduire un
 * visiteur vers une page vide.
 *
 * Une clé absente de la carte vaut « alimentée » : les pages de contenu
 * éditorial statique (accueil, contact, mentions) ne sont jamais masquées.
 */
export type PopulatedRoutes = Partial<Record<RouteKey, boolean>>;

export async function getPopulatedRoutes(locale: Locale): Promise<PopulatedRoutes> {
  const [posts, projects, services, research, skills, links, engagement, cv, resources] = await Promise.all([
    getPosts(locale),
    getProjects(locale),
    getServices(locale),
    getResearch(locale),
    getSkills(locale),
    getSocialLinks(),
    getPage("engagement", locale),
    getPage("cv", locale),
    countPublishedResources(),
  ]);

  const hasBody = (page: Awaited<ReturnType<typeof getPage>>) =>
    Boolean(page && (page.body || page.sections.length || page.timeline.length || page.items.length));

  return {
    blog: posts.length > 0,
    projects: projects.length > 0,
    services: services.length > 0,
    research: research.length > 0,
    skills: skills.length > 0,
    links: links.length > 0,
    engagement: hasBody(engagement),
    cv: hasBody(cv),
    resources: resources > 0,
  };
}

/**
 * Ressources publiques réellement publiées.
 *
 * Seules les ressources `public` sont comptées : une bibliothèque qui ne
 * contiendrait que des documents réservés ne doit pas être annoncée dans la
 * navigation d'un visiteur anonyme, qui n'y verrait rien.
 */
async function countPublishedResources(): Promise<number> {
  if (!(await tryConnectToDatabase())) return 0;
  try {
    return await ContentResourceModel.countDocuments({
      status: "published",
      visibility: "public",
      publishedAt: { $lte: new Date() },
    });
  } catch {
    return 0;
  }
}
