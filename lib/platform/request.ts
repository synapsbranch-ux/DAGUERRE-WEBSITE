import { headers } from "next/headers";

import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { PATHNAME_HEADER } from "@/lib/platform/pathname";

/**
 * Chemin public de la requête courante.
 *
 * Une réécriture de proxy remplace l'URL interne : `/en/client/quotes` est
 * servi par `/en/espace-client/devis`, et un layout n'a de toute façon aucun
 * accès au chemin. Le proxy pose donc le chemin **public** dans un en-tête,
 * seule source fiable pour construire un retour de connexion ou un lien
 * canonique côté serveur.
 */
export { PATHNAME_HEADER };

/** Chemin public demandé, ou `null` hors du champ d'action du proxy. */
export async function currentPathname(): Promise<string | null> {
  const value = (await headers()).get(PATHNAME_HEADER);
  return value && value.startsWith("/") ? value : null;
}

/** Locale déduite du chemin public courant. */
export async function currentLocaleFromPath(): Promise<Locale> {
  const path = await currentPathname();
  const segment = path?.split("/").filter(Boolean)[0] ?? "";
  return isLocale(segment) ? segment : defaultLocale;
}
