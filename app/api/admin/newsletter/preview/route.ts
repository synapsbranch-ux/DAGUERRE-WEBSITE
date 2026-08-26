import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin";
import { readJson } from "@/lib/http";
import { renderCampaign } from "@/lib/platform/newsletter";
import { campaignInputSchema } from "@/lib/validation-platform";

/**
 * Aperçu d'une campagne.
 *
 * Rendu **côté serveur**, avec exactement le même code que l'envoi réel : un
 * aperçu approximatif, produit par un second chemin de rendu, laisserait
 * découvrir les écarts une fois le message parti.
 *
 * Le HTML retourné est affiché dans une `iframe` isolée : c'est du contenu
 * rédigé par l'administrateur, mais l'isoler évite qu'une balise mal placée
 * perturbe le tableau de bord lui-même.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = campaignInputSchema.partial().safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  const email = renderCampaign(
    {
      subject: parsed.data.subject ?? "",
      previewText: parsed.data.previewText ?? "",
      content: parsed.data.content ?? "",
      locale: parsed.data.locale ?? "fr",
    },
    "#apercu",
  );

  return NextResponse.json({ html: email.html, text: email.text });
}
