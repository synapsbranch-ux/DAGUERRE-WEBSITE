"use client";

import * as React from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/** Le serveur n'a pas de préférence système : on suppose du mouvement plein. */
function getServerSnapshot() {
  return false;
}

/**
 * `prefers-reduced-motion: reduce` observé en direct.
 *
 * `useSyncExternalStore` plutôt qu'un `useState` posé depuis un effet : la
 * media query est un état externe au rendu React, exactement ce pour quoi
 * ce hook existe — et il évite le rendu-puis-correction que produirait un
 * `setState` synchrone dans un effet.
 *
 * Le rendu serveur et la première passe client renvoient `false` : la valeur
 * réelle n'est lue qu'après l'hydratation, sinon le HTML pré-rendu et le HTML
 * hydraté divergeraient. Les composants concernés doivent donc rester lisibles
 * dans les deux états — le mouvement s'arrête, le contenu ne bouge pas.
 */
export function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
