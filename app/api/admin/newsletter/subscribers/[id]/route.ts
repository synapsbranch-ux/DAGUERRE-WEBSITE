import { NextResponse } from "next/server";

import { requireAdminApi, readSession } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { NewsletterSubscriberModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { subscriberStatusSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Introuvable" }, { status: 404 });

/**
 * Changement de statut d'un abonné.
 *
 * Réactiver quelqu'un qui s'est désabonné n'est légitime que sur demande
 * explicite de sa part ; l'opération est donc tracée au journal, avec l'ancien
 * et le nouveau statut.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = subscriberStatusSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });

  await connectToDatabase();
  const previous = (await NewsletterSubscriberModel.findById(id).lean()) as { status?: string } | null;
  if (!previous) return notFound();

  const now = new Date();
  const status = parsed.data.status;

  const doc = await NewsletterSubscriberModel.findByIdAndUpdate(
    id,
    {
      $set: {
        status,
        unsubscribedAt: status === "unsubscribed" ? now : null,
        ...(status === "active" ? { confirmedAt: now } : {}),
      },
    },
    { new: true },
  );
  if (!doc) return notFound();

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "subscriber_status_changed",
    entityType: "NewsletterSubscriber",
    entityId: id,
    metadata: { from: previous.status ?? "", to: status },
  });

  return NextResponse.json({ ok: true, status });
}

/**
 * Suppression définitive.
 *
 * Le désabonnement conserve la trace du refus ; la suppression l'efface. Elle
 * n'a de sens que pour une demande d'effacement, et reste donc une action
 * distincte, confirmée, et journalisée.
 */
export async function DELETE(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  await connectToDatabase();
  const doc = await NewsletterSubscriberModel.findByIdAndDelete(id).lean();
  if (!doc) return notFound();

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "subscriber_deleted",
    entityType: "NewsletterSubscriber",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
