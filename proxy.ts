import { NextResponse, type NextRequest } from "next/server";

import { isLocale, locales, negotiateLocale, type Locale } from "@/lib/i18n";
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
 * Le contrôle d'authentification n'est *pas* fait ici : Better Auth documente
 * la vérification par cookie comme non sécurisée. `/admin` est simplement
 * exclu de la logique de locale ; la session est validée dans son layout.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Slug public traduit → chemin interne (français).
  const internal = toInternalPath(locale, rest);
  if (internal !== null) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/${internal}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Tout sauf :
     *  - les internes Next (`_next`) et les routes d'API
     *  - le tableau de bord et la connexion, qui ne sont pas localisés
     *  - les fichiers de métadonnées servis à la racine
     *  - tout chemin contenant un point (fichiers statiques)
     */
    "/((?!_next|api|admin|connexion|favicon\\.ico|icon|apple-icon|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|opengraph-image|.*\\..*).*)",
  ],
};

/** Réexporté pour que la liste des locales reste visible depuis ce fichier. */
export { locales };
