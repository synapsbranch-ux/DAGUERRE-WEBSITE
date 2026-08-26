import { NextResponse } from "next/server";

import { signIn } from "@logto/next/server-actions";

import { callbackUri, isLogtoConfigured, logtoConfig } from "@/lib/auth/logto";
import { defaultLocale, isLocale } from "@/lib/i18n";
import { safeNextPath } from "@/lib/platform/pathname";

export const runtime = "nodejs";

/**
 * Départ vers l'écran de connexion de Logto.
 *
 * Deux paramètres facultatifs :
 *
 * - `suivant` : la page que le visiteur demandait. Elle est passée à Logto comme
 *   `postRedirectUri`, que le SDK conserve **dans la session de connexion
 *   chiffrée côté serveur** — elle ne circule pas en clair dans l'URL de retour
 *   et n'est donc pas manipulable. On la fait quand même passer par
 *   `safeNextPath` : une défense en profondeur ne coûte rien ici.
 * - `ecran=inscription` : ouvre directement le formulaire de création de compte.
 */
export async function GET(request: Request) {
  if (!isLogtoConfigured()) {
    return NextResponse.json({ error: "Authentification non configurée." }, { status: 503 });
  }

  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("suivant"), "");
  const register = url.searchParams.get("ecran") === "inscription";

  const requested = url.searchParams.get("langue") ?? "";
  const locale = isLocale(requested) ? requested : defaultLocale;

  // `signIn` lève la redirection de Next : elle traverse ce gestionnaire.
  await signIn(logtoConfig(), {
    redirectUri: callbackUri(),
    ...(next ? { postRedirectUri: new URL(next, url.origin).toString() } : {}),
    ...(register ? { firstScreen: "register" as const } : {}),
    // L'écran de Logto s'affiche dans la langue du site plutôt qu'en anglais
    // par défaut.
    extraParams: { ui_locales: locale },
  });

  // Inatteignable : `signIn` redirige toujours.
  return NextResponse.json({ error: "Redirection impossible." }, { status: 500 });
}
