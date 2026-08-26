/**
 * En-tête portant le chemin public de la requête.
 *
 * Isolé dans son propre module, sans aucune importation : il est lu par le
 * proxy — qui s'exécute avant le rendu et ne doit pas charger `next/headers` —
 * et par les composants serveur.
 */
export const PATHNAME_HEADER = "x-daguerre-pathname";

/**
 * Chemin de retour sûr.
 *
 * Seul un chemin interne est accepté. `//exemple.com` et `https://exemple.com`
 * sont rejetés : le premier est une URL protocole-relative, et les deux
 * transformeraient la page de connexion en tremplin de redirection ouverte.
 *
 * Isolé ici, sans dépendance : le contrôle est utilisé par les pages, par une
 * route d'API, et il est testé pour lui-même.
 */
export function safeNextPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  // `/\evil.com` est traité comme protocole-relatif par certains navigateurs.
  if (/^\/[\t\n\r ]*\//.test(trimmed)) return fallback;
  return trimmed;
}
