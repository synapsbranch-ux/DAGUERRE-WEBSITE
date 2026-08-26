import { NextResponse } from "next/server";

import { requireAdminApi, readSession } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { NewsletterSubscriberModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { isDuplicateKeyError } from "@/lib/platform/idempotency";
import { adminSubscriberCreateSchema } from "@/lib/validation-platform";

/**
 * Ajout manuel d'un abonné.
 *
 * Réservé à l'administration, pour reprendre une inscription recueillie hors
 * ligne — un formulaire papier lors d'une conférence, par exemple. La source
 * est forcée à `admin` : elle documente que le consentement n'a pas transité
 * par le site, ce qui doit rester visible dans la liste.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = adminSubscriberCreateSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  await connectToDatabase();
  const session = await readSession();
  const now = new Date();

  try {
    const doc = await NewsletterSubscriberModel.create({
      ...parsed.data,
      source: "admin",
      consentAt: now,
      confirmedAt: parsed.data.status === "active" ? now : null,
    });

    await recordAudit({
      actorId: session?.user.id,
      actorEmail: session?.user.email,
      action: "subscriber_created",
      entityType: "NewsletterSubscriber",
      entityId: String(doc._id),
      metadata: { status: parsed.data.status },
    });

    return NextResponse.json({ id: String(doc._id) }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "Cette adresse est déjà inscrite." }, { status: 409 });
    }
    return NextResponse.json({ error: "L'enregistrement a échoué." }, { status: 500 });
  }
}
