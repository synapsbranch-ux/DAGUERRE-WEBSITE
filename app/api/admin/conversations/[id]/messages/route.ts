import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ConversationModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { claimAttachments } from "@/lib/platform/attachments";
import { appendMessage, markConversationRead, notifyClientOfMessage } from "@/lib/platform/messaging";
import { logQuoteActivity } from "@/lib/platform/quotes";
import { messageInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Réponse de l'administration.
 *
 * Ce point d'entrée n'écrit que des messages **visibles du client**. Les notes
 * internes passent par `/api/admin/quotes/[id]/notes`, dans une collection
 * séparée : aucune confusion possible entre les deux, et aucun booléen à ne
 * pas oublier.
 */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = messageInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  await connectToDatabase();
  const conversation = (await ConversationModel.findById(id).lean()) as Record<string, unknown> | null;
  if (!conversation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const session = await readSession();
  const name = session?.user.name || "Daguerre";

  const attachments = await claimAttachments(parsed.data.attachmentFileIds, {
    conversationId: id,
    uploadedBy: session?.user.id ?? "",
  });

  await appendMessage(
    id,
    { id: session?.user.id ?? "", name, role: "admin" },
    parsed.data.body,
    attachments,
  );
  await markConversationRead(id, "admin");
  await notifyClientOfMessage(conversation, name);

  if (conversation.quoteId) {
    await logQuoteActivity(String(conversation.quoteId), "message_sent", {
      id: session?.user.id ?? "",
      email: session?.user.email ?? "",
      role: "admin",
    });
  }

  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "message_sent",
    entityType: "Conversation",
    entityId: id,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
