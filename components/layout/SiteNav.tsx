"use client";

import { HoverGradientNavBar } from "@/components/ruixen/hover-gradient-navbar";
import { usePublicPathname } from "@/hooks/use-public-pathname";

export type SiteNavItem = { label: string; href: string; icon?: React.ReactNode };

/**
 * Navigation principale du bureau.
 *
 * Le seul rôle de ce fichier est de marquer l'entrée courante : le rendu et
 * l'interaction viennent de `HoverGradientNavBar` (Ruixen UI). La lecture du
 * chemin courant impose un composant client, mais il reste minuscule —
 * l'en-tête et les pages restent rendus côté serveur.
 */
export function SiteNav({ items, label }: { items: SiteNavItem[]; label: string }) {
  // Forme publique du chemin : le proxy réécrit les slugs traduits, et
  // comparer un chemin interne à un lien public marquerait la mauvaise entrée
  // — différemment côté serveur et côté navigateur.
  const pathname = usePublicPathname();

  return (
    <HoverGradientNavBar
      aria-label={label}
      className="hidden xl:block text-white/74"
      items={items.map((item) => ({
        ...item,
        current: pathname === item.href || pathname.startsWith(`${item.href}/`),
      }))}
    />
  );
}
