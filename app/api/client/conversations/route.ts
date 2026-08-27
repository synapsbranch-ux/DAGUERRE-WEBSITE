import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/client";
import {
  ClientProjectModel,
  ConversationModel,
  QuoteRequestModel,
} from "@/lib/db/models/platform";
import { adminNotificationAddress, adminUrl, sendTransactionalEmail } from "@/lib/email/service";
import { newMessageEmail } from "@/lib/email/templates";
import { clientIp, readJson } from "@/lib/http";
import { isDenied, requireSessionApi } from "@/lib/platform/access";
import { appendMessage } from "@/lib/platform/messaging";
import { slidingWindow } from "@/lib/rate-limit";
import { conversationCreateSchema } from "@/lib/validation-platform";

/**
 * Ouverture d'une conversation par le client.
 *
 * Les rattachements facultatifs — devis, projet — sont **vérifiés** : un
 * identifiant qui n'appartient pas au compte est ignoré plutôt qu'accepté,
 * sans quoi un client pourrait accrocher sa conversation au dossier d'un
 * autre et la voir apparaître dans son suivi.
 */
export async function POST(request: Request) {
  const guard = await requireSessionApi();
  if (isDenied(guard)) return guard.denied;

  const user = guard.session.user;
  if (!(await slidingWindow(`conversation:${user.id}:${clientIp(request)}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de conversations ouvertes. Réessayez plus tard." }, { status: 429 });
  }

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = conversationCreateSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  await connectToDatabase();
  const data = parsed.data;

  const quoteId =
    data.quoteId && (await QuoteRequestModel.exists({ _id: data.quoteId, userId: user.id }))
      ? data.quoteId
      : null;

  const projectId =
    data.projectId && (await ClientProjectModel.exists({ _id: data.projectId, clientId: user.id }))
      ? data.projectId
      : null;

  const conversation = await ConversationModel.create({
    clientId: user.id,
    context: quoteId ? "quote" : projectId ? "project" : data.context,
    quoteId,
    projectId,
    subject: data.subject,
    status: "open",
    lastMessageAt: new Date(),
  });

  const conversationId = String(conversation._id);
  await appendMessage(conversationId, { id: user.id, name: user.name || user.email, role: "customer" }, data.body);

  const alert = adminNotificationAddress();
  if (alert) {
    await sendTransactionalEmail(
      alert,
      newMessageEmail("fr", {
        subject: data.subject,
        reference: "",
        url: adminUrl(`/admin/conversations/${conversationId}`),
        forAdmin: true,
        senderName: user.name || user.email,
      }),
    );
  }

  return NextResponse.json({ id: conversationId }, { status: 201 });
}
