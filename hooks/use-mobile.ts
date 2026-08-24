import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Version du hook shadcn réécrite avec `useSyncExternalStore`.
 *
 * La version d'origine appelait `setState` dans le corps d'un `useEffect`, ce
 * que la règle `react-hooks/set-state-in-effect` d'eslint-config-next 16
 * refuse. `useSyncExternalStore` est le mécanisme prévu pour s'abonner à une
 * source externe : il évite le rendu en cascade et fournit un instantané
 * cohérent côté serveur.
 */
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

/** Côté serveur, on suppose le bureau : pas de `window` à interroger. */
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
