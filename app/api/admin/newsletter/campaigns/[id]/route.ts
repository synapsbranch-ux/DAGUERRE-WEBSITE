import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { NewsletterCampaignModel, NewsletterRecipientModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { campaignInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Introuvable" }, { status: 404 });

/**
 * Modification d'une campagne.
 *
 * Une campagne partie — `sending`, `sent` — n'est plus modifiable : réécrire
 * l'objet ou le corps d'un message déjà distribué produirait un historique qui
 * ne correspond à rien de ce que les abonnés ont reçu.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = campaignInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();

  const doc = await NewsletterCampaignModel.findOneAndUpdate(
    { _id: id, status: { $in: ["draft", "ready", "cancelled", "failed"] } },
    {
      $set: {
        ...parsed.data,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      },
    },
    { new: true },
  );

  if (!doc) {
    const exists = await NewsletterCampaignModel.exists({ _id: id });
    return exists
      ? NextResponse.json({ error: "Une campagne envoyée ou en cours d'envoi n'est plus modifiable." }, { status: 409 })
      : notFound();
  }

  return NextResponse.json({ id: String(doc._id) });
}

/**
 * Suppression d'une campagne.
 *
 * Seuls les brouillons et les campagnes annulées partent. L'historique d'un
 * envoi réel — qui a reçu quoi, quand, avec quel résultat — se conserve.
 */
export async function DELETE(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  await connectToDatabase();
  const doc = await NewsletterCampaignModel.findOneAndDelete({
    _id: id,
    status: { $in: ["draft", "cancelled"] },
  }).lean();

  if (!doc) {
    const exists = await NewsletterCampaignModel.exists({ _id: id });
    return exists
      ? NextResponse.json({ error: "Seuls un brouillon ou une campagne annulée peuvent être supprimés." }, { status: 409 })
      : notFound();
  }

  await NewsletterRecipientModel.deleteMany({ campaignId: id });
  return NextResponse.json({ ok: true });
}
