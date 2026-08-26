import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { campaignAudiences, isMember } from "@/lib/platform/enums";
import { countAudience } from "@/lib/platform/newsletter";

/**
 * Nombre réel de destinataires d'une audience.
 *
 * Compté en base au moment de la demande, jamais estimé : la boîte de dialogue
 * d'envoi affiche ce chiffre avant de laisser lancer une campagne, et une
 * approximation y serait pire qu'inutile.
 */
export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const type = new URL(request.url).searchParams.get("type") ?? "all_active";
  if (!isMember(campaignAudiences, type)) {
    return NextResponse.json({ error: "Audience inconnue." }, { status: 400 });
  }

  await connectToDatabase();
  return NextResponse.json({ audience: type, count: await countAudience(type) });
}
