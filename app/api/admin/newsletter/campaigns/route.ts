import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { NewsletterCampaignModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { readSchedule } from "@/lib/platform/schedule";
import { campaignInputSchema } from "@/lib/validation-platform";

/**
 * Création d'une campagne.
 *
 * `status` n'appartient pas au schéma d'entrée : le formulaire ne peut pas
 * produire une campagne réputée envoyée. Il se déduit d'une seule chose — une
 * date de départ future place la campagne en « programmée », son absence en
 * brouillon.
 *
 * Une date **passée** est refusée plutôt que lancée immédiatement : elle vient
 * presque toujours d'une faute de frappe, et un envoi de masse n'est pas une
 * opération sur laquelle on veut deviner l'intention.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = campaignInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const schedule = readSchedule(parsed.data.scheduledAt);
  if ("error" in schedule) return schedule.error;

  await connectToDatabase();
  const session = await readSession();

  const doc = await NewsletterCampaignModel.create({
    ...parsed.data,
    scheduledAt: schedule.at,
    status: schedule.at ? "scheduled" : "draft",
    createdById: session?.user.id ?? "",
  });

  return NextResponse.json({ id: String(doc._id) }, { status: 201 });
}
