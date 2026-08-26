"use client";

import { usePathname } from "next/navigation";

import { HoverGradientNavBar } from "@/components/ruixen/hover-gradient-navbar";

export type SiteNavItem = { label: string; href: string; icon?: React.ReactNode };

/**
 * Navigation principale du bureau.
 *
 * Le seul rôle de ce fichier est de marquer l'entrée courante : le rendu et
 * l'interaction viennent de `HoverGradientNavBar` (Ruixen UI). `usePathname`
 * impose un composant client, mais il reste minuscule — l'en-tête et les
 * pages restent rendus côté serveur.
 */
export function SiteNav({ items, label }: { items: SiteNavItem[]; label: string }) {
  const pathname = usePathname() ?? "";

  return (
    <HoverGradientNavBar
      aria-label={label}
      className="hidden lg:block text-white/74"
      items={items.map((item) => ({
        ...item,
        current: pathname === item.href || pathname.startsWith(`${item.href}/`),
      }))}
    />
  );
}
