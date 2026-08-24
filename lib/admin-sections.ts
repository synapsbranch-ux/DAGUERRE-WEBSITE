import type { AdminResourceKey, SingletonKey } from "@/lib/admin-content";

/**
 * Carte des écrans du tableau de bord.
 *
 * Un seul endroit décrit l'URL, le libellé, le groupe de navigation et la
 * nature de chaque section — collection listable, réglage unique ou boîte de
 * réception. La navigation, les listes et les fiches en découlent, ce qui
 * évite qu'un menu propose une section que les pages ne savent pas rendre.
 */

export type AdminSection =
  | { path: string; label: string; group: AdminGroup; kind: "collection"; resource: AdminResourceKey }
  | { path: string; label: string; group: AdminGroup; kind: "singleton"; singleton: SingletonKey }
  | { path: string; label: string; group: AdminGroup; kind: "homepage" }
  | { path: string; label: string; group: AdminGroup; kind: "messages" };

export type AdminGroup = "Contenus" | "Pages" | "Réglages";

export const adminSections: AdminSection[] = [
  { path: "articles", label: "Articles", group: "Contenus", kind: "collection", resource: "posts" },
  { path: "projets", label: "Réalisations", group: "Contenus", kind: "collection", resource: "projects" },
  { path: "services", label: "Services", group: "Contenus", kind: "collection", resource: "services" },
  { path: "research", label: "Recherche", group: "Contenus", kind: "collection", resource: "research" },
  { path: "skills", label: "Compétences", group: "Contenus", kind: "collection", resource: "skills" },
  { path: "media", label: "Médias", group: "Contenus", kind: "collection", resource: "media" },
  { path: "messages", label: "Messages", group: "Contenus", kind: "messages" },

  { path: "homepage", label: "Accueil", group: "Pages", kind: "homepage" },
  { path: "a-propos", label: "À propos", group: "Pages", kind: "singleton", singleton: "about" },
  { path: "datakle", label: "Datakle", group: "Pages", kind: "singleton", singleton: "datakle" },
  { path: "engagement", label: "Engagement", group: "Pages", kind: "singleton", singleton: "engagement" },
  { path: "cv", label: "CV", group: "Pages", kind: "singleton", singleton: "cv" },

  { path: "profile", label: "Profil", group: "Réglages", kind: "singleton", singleton: "profile" },
  { path: "social", label: "Réseaux sociaux", group: "Réglages", kind: "collection", resource: "social" },
  { path: "settings", label: "Paramètres", group: "Réglages", kind: "singleton", singleton: "settings" },
];

export const adminGroups: AdminGroup[] = ["Contenus", "Pages", "Réglages"];

export function findSection(path: string): AdminSection | undefined {
  return adminSections.find((section) => section.path === path);
}

/** Chemin d'administration correspondant à une ressource — pour les liens de retour. */
export function sectionPathFor(resource: AdminResourceKey): string {
  return adminSections.find((section) => section.kind === "collection" && section.resource === resource)?.path ?? "";
}
