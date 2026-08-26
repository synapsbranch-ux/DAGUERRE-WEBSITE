import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { QuoteRequestModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { quoteAssignSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Priorité et affectation d'un dossier.
 *
 * Ni l'une ni l'autre n'est visible du client : ce sont des informations
 * d'organisation interne. Le statut, lui, a son propre point d'entrée, parce
 * qu'il déclenche notification et courriel.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = quoteAssignSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  await connectToDatabase();

  const update: Record<string, unknown> = {};
  if (parsed.data.priority) update.priority = parsed.data.priority;
  if (parsed.data.assignedToId !== undefined) update.assignedToId = parsed.data.assignedToId;

  const doc = await QuoteRequestModel.findByIdAndUpdate(id, { $set: update }, { new: true });
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (parsed.data.assignedToId !== undefined) {
    const session = await readSession();
    await recordAudit({
      actorId: session?.user.id,
      actorEmail: session?.user.email,
      action: "quote_assigned",
      entityType: "QuoteRequest",
      entityId: id,
      metadata: { assignedToId: parsed.data.assignedToId },
    });
  }

  return NextResponse.json({ ok: true });
}
