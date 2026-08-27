import { NextResponse } from "next/server";

import { readPlatformSession } from "@/lib/platform/access";
import { landingHref } from "@/lib/platform/landing";

/**
 * Destination après authentification, pour un appelant côté navigateur.
 *
 * La décision elle-même vit dans `lib/platform/landing.ts` : la route de rappel
 * de Logto en a besoin sans passer par le réseau.
 */
export async function GET(request: Request) {
  const session = await readPlatformSession();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const requested = new URL(request.url).searchParams.get("suivant");
  return NextResponse.json({ href: await landingHref(session.user, requested) });
}
