"use client";

import * as React from "react";

/**
 * `prefers-reduced-motion: reduce` observé en direct.
 *
 * Le rendu serveur et la première passe client renvoient `false` : la valeur
 * réelle n'est lue qu'après le montage, sinon le HTML pré-rendu et le HTML
 * hydraté divergeraient. Les composants concernés doivent donc rester lisibles
 * dans les deux états — le mouvement s'arrête, le contenu ne bouge pas.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
