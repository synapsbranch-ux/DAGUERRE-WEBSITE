/**
 * En-tête portant le chemin public de la requête.
 *
 * Isolé dans son propre module, sans aucune importation : il est lu par le
 * proxy — qui s'exécute avant le rendu et ne doit pas charger `next/headers` —
 * et par les composants serveur.
 */
export const PATHNAME_HEADER = "x-daguerre-pathname";
