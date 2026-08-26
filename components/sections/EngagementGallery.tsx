import ScrollImageTunnel from "@/components/ruixen/scroll-image-tunnel";
import { isUnconfiguredRemoteImage, resolveKnownImageSource } from "@/lib/media/assets";

/**
 * Récit photographique de la page Engagement — Ruixen UI « Scroll Image
 * Tunnel » : chaque photo grandit depuis un point au centre du cadre fixe
 * jusqu'à le recouvrir, avant de céder la place à la suivante au fil du
 * défilement. Sous `prefers-reduced-motion`, le composant retombe sur une
 * pile d'images statiques — c'est son propre repli, pas le nôtre.
 *
 * N'affiche rien tant que la galerie du CMS n'a pas au moins deux images :
 * le tunnel perd son sens avec une seule photo.
 */
export function EngagementGallery({ images, hint }: { images: string[]; hint: string }) {
  if (images.length < 2) return null;

  const slides = images.map((src) => {
    const source = resolveKnownImageSource(src);
    return {
      src: typeof source === "string" ? source : source.src,
      alt: "",
      unoptimized: isUnconfiguredRemoteImage(source),
    };
  });

  return <ScrollImageTunnel images={slides} hint={hint} className="border-t border-border" />;
}
