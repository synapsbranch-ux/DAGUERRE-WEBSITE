"use client";

import { LiquefyProvider } from "@liquefy-ui/react";
import type { ReactNode } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Racine Liquefy — configure le verre liquide pour l'ensemble du site.
 *
 * Le `tint` reprend le cuivre de la charte plutôt que le gris par défaut du
 * paquet : sans cela les surfaces trahiraient la bibliothèque d'origine.
 * `theme="light"` correspond au `colorScheme` déclaré dans le layout.
 *
 * Liquefy n'observe pas `prefers-reduced-motion` : on coupe nous-mêmes les
 * ressorts et le shader WebGL, ce qui laisse le matériau CSS transparent —
 * l'apparence reste, seule l'animation disparaît.
 *
 * Le fournisseur ne rend qu'un contexte : il n'introduit aucun nœud DOM
 * supplémentaire et laisse les pages en rendu serveur.
 */
export function LiquefyRoot({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();

  return (
    <LiquefyProvider
      theme="light"
      tint="#c47c4b"
      intensity={0.9}
      wobbliness={0.55}
      spacing={4}
      motion={!reduced}
      webgl={!reduced}
      /* Le fournisseur rend un `div` : il reprend la colonne flexible du
         `body` pour que le pied de page reste collé en bas. */
      className="flex min-h-full flex-1 flex-col"
    >
      {children}
    </LiquefyProvider>
  );
}
