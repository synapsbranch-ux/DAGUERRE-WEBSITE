import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ConversationModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { conversationStatusSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Ouverture, fermeture ou archivage d'une conversation.
 *
 * Fermer n'efface rien : le fil reste lisible par le client, il cesse
 * seulement d'attendre une réponse. Archiver le retire des boîtes de
 * réception sans le supprimer — l'échange écrit d'un dossier commercial se
 * conserve.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = conversationStatusSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });

  await connectToDatabase();
  const doc = await ConversationModel.findByIdAndUpdate(
    id,
    { $set: { status: parsed.data.status } },
    { new: true },
  );
  if (!doc) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "conversation_status_changed",
    entityType: "Conversation",
    entityId: id,
    metadata: { status: parsed.data.status },
  });

  return NextResponse.json({ ok: true });
}
