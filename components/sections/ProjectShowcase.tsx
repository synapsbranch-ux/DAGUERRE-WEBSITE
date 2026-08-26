import ScrollTiltedGrid from "@/components/ruixen/scroll-tilted-grid";
import { resolveKnownImageSource } from "@/lib/media/assets";
import type { Project } from "@/lib/types";

/**
 * Ouverture visuelle de la page Réalisations.
 *
 * Ruixen UI « Scroll Tilted Grid » : les visuels montent basculés vers
 * l'arrière, se redressent au passage du regard puis repartent. La grille
 * peint ses tuiles en `background-image` — c'est sa technique — et ne remplace
 * donc pas les cartes : elle les annonce. Les cartes cliquables et décrites
 * suivent juste en dessous.
 *
 * Rien n'est rendu tant qu'aucun projet publié n'a de visuel.
 */
export function ProjectShowcase({ projects }: { projects: Project[] }) {
  const images = projects
    .map((project) => (project.image ? resolveKnownImageSource(project.image) : null))
    .filter((source): source is NonNullable<typeof source> => source !== null)
    /* Une source distante non déclarée dans `next.config` ne peut pas être
       optimisée, mais un fond CSS s'en accommode : on la garde telle quelle. */
    .map((source) => (typeof source === "string" ? source : source.src))
    .filter((src) => src.length > 0);

  if (images.length < 2) return null;

  return (
    <ScrollTiltedGrid
      images={images}
      aspectRatio="3/4"
      maxWidth="lg"
      gap={10}
      maxTilt={62}
      maxBlur={6}
      rounded="1rem"
      loop={images.length < 6}
    />
  );
}
