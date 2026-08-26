import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { NewsletterCampaignModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { campaignInputSchema } from "@/lib/validation-platform";

/**
 * Création d'une campagne.
 *
 * Elle naît **toujours** en brouillon : `status` n'appartient pas au schéma
 * d'entrée, seul le moteur d'envoi le fait évoluer. Un formulaire ne peut donc
 * pas produire une campagne réputée envoyée.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = campaignInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();
  const session = await readSession();

  const doc = await NewsletterCampaignModel.create({
    ...parsed.data,
    scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    status: "draft",
    createdById: session?.user.id ?? "",
  });

  return NextResponse.json({ id: String(doc._id) }, { status: 201 });
}
