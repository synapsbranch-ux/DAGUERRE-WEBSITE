import { NextResponse } from "next/server";

import { ClientProfileModel } from "@/lib/db/models/platform";
import { tryConnectToDatabase } from "@/lib/db/client";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { readPlatformSession, safeNextPath } from "@/lib/platform/access";
import { isAdminRole } from "@/lib/platform/enums";
import { href } from "@/lib/routes";

/**
 * Destination après authentification.
 *
 * Le navigateur ne décide pas où il atterrit : il demande, le serveur répond
 * à partir du rôle réel de la session. Sans cela, il suffirait de bricoler une
 * réponse locale pour se retrouver sur `/admin` — la page rejetterait bien
 * l'accès, mais la logique de redirection n'aurait rien à voir avec la
 * réalité des droits.
 *
 * `suivant` est repassé par le formulaire ; il n'est retenu que s'il désigne
 * un chemin interne.
 */
export async function GET(request: Request) {
  const session = await readPlatformSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const url = new URL(request.url);
  const requested = safeNextPath(url.searchParams.get("suivant"), "");

  if (requested) return NextResponse.json({ href: requested });

  if (isAdminRole(session.user.role)) return NextResponse.json({ href: "/admin" });

  return NextResponse.json({ href: href("portal", await preferredLocale(session.user.id)) });
}

/** Langue de correspondance du client, quand son profil en déclare une. */
async function preferredLocale(userId: string): Promise<Locale> {
  if (!(await tryConnectToDatabase())) return defaultLocale;
  const profile = (await ClientProfileModel.findOne({ userId })
    .select("preferredLanguage")
    .lean()) as { preferredLanguage?: string } | null;
  const value = profile?.preferredLanguage ?? "";
  return isLocale(value) ? value : defaultLocale;
}
