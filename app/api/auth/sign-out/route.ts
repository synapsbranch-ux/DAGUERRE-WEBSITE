import { NextResponse } from "next/server";

import { signOut } from "@logto/next/server-actions";

import { isLogtoConfigured, logtoConfig } from "@/lib/auth/logto";
import { defaultLocale, isLocale } from "@/lib/i18n";

export const runtime = "nodejs";

/**
 * Déconnexion : purge de la session locale puis passage par Logto.
 *
 * Ne pas passer par Logto ne fermerait que notre moitié de la session : le
 * visiteur se croirait déconnecté, et la connexion suivante repartirait sans
 * qu'on lui redemande rien.
 *
 * Réservé à `POST` : une déconnexion accessible en `GET` se déclenche depuis une
 * simple balise `<img>` sur un site tiers.
 */
export async function POST(request: Request) {
  if (!isLogtoConfigured()) {
    return NextResponse.json({ error: "Authentification non configurée." }, { status: 503 });
  }

  const requested = new URL(request.url).searchParams.get("langue") ?? "";
  const locale = isLocale(requested) ? requested : defaultLocale;

  await signOut(logtoConfig(), new URL(`/${locale}`, new URL(request.url).origin).toString());

  return NextResponse.json({ error: "Redirection impossible." }, { status: 500 });
}
