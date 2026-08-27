import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/client";
import { ConversationModel, QuoteRequestModel } from "@/lib/db/models/platform";
import { adminNotificationAddress, adminUrl, sendTransactionalEmail } from "@/lib/email/service";
import { newMessageEmail } from "@/lib/email/templates";
import { readJson, validObjectId } from "@/lib/http";
import { isDenied, notFoundResponse, requireSessionApi } from "@/lib/platform/access";
import { claimAttachments } from "@/lib/platform/attachments";
import { appendMessage, markConversationRead } from "@/lib/platform/messaging";
import { logQuoteActivity } from "@/lib/platform/quotes";
import { clientIp } from "@/lib/http";
import { slidingWindow } from "@/lib/rate-limit";
import { messageInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Message envoyé par le client.
 *
 * L'appartenance de la conversation est **dans la requête** : `clientId` vient
 * de la session, jamais du corps. Une conversation qui n'est pas la vôtre ne
 * remonte pas, et la réponse est un 404 — pas un 403 qui confirmerait son
 * existence.
 *
 * Le corps est du texte brut, échappé à l'affichage : un client ne peut pas
 * injecter de balise dans la boîte de réception de l'administration.
 */
export async function POST(request: Request, { params }: Ctx) {
  const guard = await requireSessionApi();
  if (isDenied(guard)) return guard.denied;

  const user = guard.session.user;
  if (!slidingWindow(`message:${user.id}:${clientIp(request)}`, 30, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de messages. Réessayez plus tard." }, { status: 429 });
  }

  const { id } = await params;
  if (!validObjectId(id)) return notFoundResponse();

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = messageInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  await connectToDatabase();

  const conversation = (await ConversationModel.findOne({
    _id: id,
    clientId: user.id,
    status: { $ne: "archived" },
  }).lean()) as Record<string, unknown> | null;

  if (!conversation) return notFoundResponse();

  // Chaque identifiant reçu est revérifié : seuls les fichiers déposés par cet
  // expéditeur pour cette conversation sont rattachés.
  const attachments = await claimAttachments(parsed.data.attachmentFileIds, {
    conversationId: id,
    uploadedBy: user.id,
  });

  await appendMessage(
    id,
    { id: user.id, name: user.name || user.email, role: "customer" },
    parsed.data.body,
    attachments,
  );
  await markConversationRead(id, "customer");

  const quoteId = conversation.quoteId ? String(conversation.quoteId) : "";
  if (quoteId) {
    await logQuoteActivity(quoteId, "message_sent", { id: user.id, email: user.email, role: "customer" });
  }

  const alert = adminNotificationAddress();
  if (alert) {
    const quote = quoteId
      ? ((await QuoteRequestModel.findById(quoteId).select("quoteNumber").lean()) as {
          quoteNumber?: string;
        } | null)
      : null;

    await sendTransactionalEmail(
      alert,
      newMessageEmail("fr", {
        subject: String(conversation.subject ?? ""),
        reference: String(quote?.quoteNumber ?? ""),
        url: adminUrl(quoteId ? `/admin/devis/${quoteId}` : `/admin/conversations/${id}`),
        forAdmin: true,
        senderName: user.name || user.email,
      }),
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
