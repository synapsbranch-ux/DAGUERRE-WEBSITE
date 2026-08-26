import { NextResponse, type NextRequest } from "next/server";

import { handleSignIn } from "@logto/next/server-actions";

import { isLogtoConfigured, logtoConfig } from "@/lib/auth/logto";
import { readPlatformSession } from "@/lib/platform/access";
import { landingHref } from "@/lib/platform/landing";

export const runtime = "nodejs";

/**
 * Retour depuis Logto : échange du code contre les jetons, puis atterrissage.
 *
 * `handleSignIn` écrit le cookie de session — d'où une route (et non un
 * composant serveur, où l'écriture de cookie est interdite). Si un
 * `postRedirectUri` a été enregistré au départ, le SDK y redirige lui-même ;
 * sinon on calcule la destination à partir du rôle réel, jamais d'une valeur
 * fournie par le navigateur.
 */
export async function GET(request: NextRequest) {
  if (!isLogtoConfigured()) {
    return NextResponse.json({ error: "Authentification non configurée." }, { status: 503 });
  }

  await handleSignIn(logtoConfig(), request.nextUrl);

  // Atteint seulement quand aucun `postRedirectUri` n'était enregistré.
  const session = await readPlatformSession();
  const destination = session ? await landingHref(session.user, null) : "/";

  return NextResponse.redirect(new URL(destination, request.nextUrl.origin));
}
