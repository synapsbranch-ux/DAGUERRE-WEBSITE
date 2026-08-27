import { NextResponse, type NextRequest } from "next/server";

import { isLocale, locales, negotiateLocale, type Locale } from "@/lib/i18n";
import { PATHNAME_HEADER } from "@/lib/platform/pathname";
import { toInternalPath, toPublicPath } from "@/lib/routes";

/**
 * Proxy — en Next.js 16 ce fichier remplace `middleware.ts`
 * (voir `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/middleware.md`).
 * L'option `runtime` y est interdite : le proxy tourne sur Node par défaut.
 *
 * Deux responsabilités :
 *
 * 1. **Préfixer la locale.** `/a-propos` → `/fr/a-propos`, en négociant la
 *    langue depuis `Accept-Language`.
 * 2. **Réécrire les slugs anglais.** `/en/portfolio` est rendu par la route
 *    interne `/en/realisations` sans que l'URL affichée ne change.
 *
 * Le contrôle d'authentification n'est *pas* fait ici. Le guide de Next l'écrit
 * noir sur blanc : le proxy « ne doit pas servir de solution complète de
 * gestion de session ou d'autorisation », d'autant qu'il tourne aussi sur les
 * routes préchargées. `/admin` est simplement exclu de la logique de locale ;
 * la session est validée dans son layout, au plus près des données.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Le tableau de bord n'est pas localisé : il ne reçoit que l'en-tête de
   * chemin, qui permet à sa garde de renvoyer l'administrateur exactement là
   * où il allait après sa connexion.
   */
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const headers = new Headers(request.headers);
    headers.set(PATHNAME_HEADER, pathname);
    return NextResponse.next({ request: { headers } });
  }

  const firstSegment = pathname.split("/")[1] ?? "";

  // Pas encore de locale dans l'URL → on redirige.
  if (!isLocale(firstSegment)) {
    const locale = negotiateLocale(request.headers.get("accept-language"));
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url, 307);
  }

  const locale = firstSegment as Locale;
  const rest = pathname.slice(locale.length + 1);

  /*
   * Le chemin interne français atteint depuis l'anglais (`/en/realisations`)
   * servirait la même page que `/en/portfolio` : redirection permanente vers
   * la forme publique pour éviter le contenu dupliqué.
   */
  const canonical = toPublicPath(locale, rest);
  if (canonical !== null) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/${canonical}`;
    return NextResponse.redirect(url, 308);
  }

  /*
   * Le chemin public demandé est transmis aux composants serveur.
   *
   * Une réécriture masque l'URL réelle, et un layout n'a de toute façon pas
   * accès au chemin courant. Sans cet en-tête, la garde de l'espace client ne
   * pourrait pas renvoyer le visiteur sur la page qu'il demandait après sa
   * connexion.
   */
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, pathname);

  // Slug public traduit → chemin interne (français).
  const internal = toInternalPath(locale, rest);
  if (internal !== null) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/${internal}`;
    return NextResponse.rewrite(url, { request: { headers } });
  }

  return NextResponse.next({ request: { headers } });
}


export const config = {
  matcher: [
    /*
     * Tout sauf :
     *  - les internes Next (`_next`) et les routes d'API
     *  - le tableau de bord conserve sa propre branche ci-dessus
     *  - les fichiers de métadonnées servis à la racine
     *  - tout chemin contenant un point (fichiers statiques)
     */
    "/((?!_next|api|favicon\\.ico|icon|apple-icon|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|opengraph-image|.*\\..*).*)",
  ],
};

/** Réexporté pour que la liste des locales reste visible depuis ce fichier. */
export { locales };
