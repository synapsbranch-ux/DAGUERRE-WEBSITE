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
  const [posts, projects, services, research, skills, links, engagement, cv] = await Promise.all([
    getPosts(locale),
    getProjects(locale),
    getServices(locale),
    getResearch(locale),
    getSkills(locale),
    getSocialLinks(),
    getPage("engagement", locale),
    getPage("cv", locale),
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
  };
}
