"use client";

import { usePathname } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import { publicPathname } from "@/lib/routes";

/**
 * Chemin courant, sous sa forme **publique**.
 *
 * `proxy.ts` réécrit les slugs traduits : `/en/portfolio` est rendu par
 * `/en/realisations`. Pendant le rendu serveur, `usePathname()` voit donc le
 * chemin interne ; dans le navigateur, il voit le chemin public. Un composant
 * qui compare ce chemin à un lien — pour marquer l'entrée courante — rendrait
 * deux résultats différents de part et d'autre, ce que React signale comme une
 * erreur d'hydratation.
 *
 * Normaliser des deux côtés supprime l'écart : le chemin public est laissé tel
 * quel, le chemin interne est traduit.
 */
export function usePublicPathname(): string {
  const pathname = usePathname() ?? "";
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  return isLocale(segment) ? publicPathname(segment, pathname) : pathname;
}
