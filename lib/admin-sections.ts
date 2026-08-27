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
  | { path: string; label: string; group: AdminGroup; kind: "messages" }
  /**
   * Écran servi par une route statique dédiée (`app/admin/devis/page.tsx`…).
   *
   * Ces modules — devis, clients, projets, infolettre — ont chacun leur
   * requête, leurs filtres et leurs actions : le rendu générique de
   * `app/admin/[section]` ne saurait pas les produire. Ils figurent malgré
   * tout dans cette table, seule source de la navigation : une section
   * absente d'ici serait inaccessible autrement qu'en tapant son adresse.
   */
  | { path: string; label: string; group: AdminGroup; kind: "custom" };

export type AdminGroup =
  | "Contenus"
  | "Clients"
  | "Rendez-vous"
  | "Marketing"
  | "Pages"
  | "Réglages"
  | "Système";

export const adminSections: AdminSection[] = [
  { path: "articles", label: "Articles", group: "Contenus", kind: "collection", resource: "posts" },
  { path: "projets", label: "Réalisations", group: "Contenus", kind: "collection", resource: "projects" },
  { path: "services", label: "Services", group: "Contenus", kind: "collection", resource: "services" },
  { path: "research", label: "Recherche", group: "Contenus", kind: "collection", resource: "research" },
  { path: "skills", label: "Compétences", group: "Contenus", kind: "collection", resource: "skills" },
  { path: "media", label: "Médias", group: "Contenus", kind: "collection", resource: "media" },
  { path: "ressources", label: "Ressources", group: "Contenus", kind: "custom" },
  { path: "messages", label: "Messages", group: "Contenus", kind: "messages" },

  { path: "clients", label: "Clients", group: "Clients", kind: "custom" },
  { path: "devis", label: "Devis", group: "Clients", kind: "custom" },
  { path: "projets-clients", label: "Projets", group: "Clients", kind: "custom" },
  { path: "factures", label: "Factures", group: "Clients", kind: "custom" },
  { path: "contrats", label: "Contrats", group: "Clients", kind: "custom" },
  { path: "conversations", label: "Conversations", group: "Clients", kind: "custom" },

  { path: "agenda", label: "Agenda", group: "Rendez-vous", kind: "custom" },
  { path: "rendez-vous", label: "Réservations", group: "Rendez-vous", kind: "custom" },
  { path: "disponibilites", label: "Disponibilités", group: "Rendez-vous", kind: "custom" },

  { path: "newsletter/abonnes", label: "Abonnés", group: "Marketing", kind: "custom" },
  { path: "newsletter/campagnes", label: "Campagnes", group: "Marketing", kind: "custom" },

  { path: "facturation", label: "Facturation", group: "Système", kind: "custom" },
  { path: "activite", label: "Activité", group: "Système", kind: "custom" },

  { path: "homepage", label: "Accueil", group: "Pages", kind: "homepage" },
  { path: "a-propos", label: "À propos", group: "Pages", kind: "singleton", singleton: "about" },
  { path: "datakle", label: "Datakle", group: "Pages", kind: "singleton", singleton: "datakle" },
  { path: "engagement", label: "Engagement", group: "Pages", kind: "singleton", singleton: "engagement" },
  { path: "cv", label: "CV", group: "Pages", kind: "singleton", singleton: "cv" },

  { path: "profile", label: "Profil", group: "Réglages", kind: "singleton", singleton: "profile" },
  { path: "social", label: "Réseaux sociaux", group: "Réglages", kind: "collection", resource: "social" },
  { path: "settings", label: "Paramètres", group: "Réglages", kind: "singleton", singleton: "settings" },
];

export const adminGroups: AdminGroup[] = [
  "Contenus",
  "Clients",
  "Rendez-vous",
  "Marketing",
  "Pages",
  "Réglages",
  "Système",
];

export function findSection(path: string): AdminSection | undefined {
  return adminSections.find((section) => section.path === path);
}

/** Chemin d'administration correspondant à une ressource — pour les liens de retour. */
export function sectionPathFor(resource: AdminResourceKey): string {
  return adminSections.find((section) => section.kind === "collection" && section.resource === resource)?.path ?? "";
}
