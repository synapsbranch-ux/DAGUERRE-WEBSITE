import {
  ConversationMessageModel,
  ConversationModel,
  QuoteRequestModel,
} from "@/lib/db/models/platform";
import { publicUrl, sendTransactionalEmail } from "@/lib/email/service";
import { newMessageEmail } from "@/lib/email/templates";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { notify } from "@/lib/platform/notifications";
import { findAccount } from "@/lib/platform/users";
import { href } from "@/lib/routes";
import { excerptOf } from "@/lib/platform/sanitize";

/**
 * Messagerie client ↔ administration.
 *
 * Volontairement minimale : une conversation, des messages, deux compteurs de
 * non-lus. Pas de fils, pas de réactions, pas de présence — ce n'est pas un
 * outil de discussion d'équipe, c'est la trace écrite d'un échange commercial.
 *
 * **Les notes internes ne passent pas par ici.** Elles ont leur propre
 * collection, que rien du côté client n'interroge.
 */

type Doc = Record<string, unknown>;

/** Ajoute un message et met à jour la conversation en une seule écriture. */
export async function appendMessage(
  conversationId: string,
  sender: { id: string; name: string; role: "admin" | "client" },
  body: string,
  attachments: string[] = [],
): Promise<string> {
  const message = await ConversationMessageModel.create({
    conversationId,
    senderId: sender.id,
    senderRole: sender.role,
    senderName: sender.name,
    body,
    attachments,
  });

  await ConversationModel.updateOne(
    { _id: conversationId },
    {
      $set: { lastMessageAt: new Date(), status: "open" },
      $inc: sender.role === "admin" ? { unreadForClient: 1 } : { unreadForAdmin: 1 },
    },
  );

  return String(message._id);
}

/** Remet à zéro le compteur de non-lus du lecteur. */
export async function markConversationRead(
  conversationId: string,
  reader: "admin" | "client",
): Promise<void> {
  await ConversationModel.updateOne(
    { _id: conversationId },
    { $set: reader === "admin" ? { unreadForAdmin: 0 } : { unreadForClient: 0 } },
  );
}

/**
 * Prévient le client qu'un message l'attend.
 *
 * Le corps du message n'est **pas** repris dans le courriel : un courriel
 * transite en clair par plusieurs serveurs et s'affiche en aperçu sur un
 * écran verrouillé. Seuls la référence du dossier et le lien y figurent.
 */
export async function notifyClientOfMessage(conversation: Doc, senderName: string): Promise<void> {
  const clientId = String(conversation.clientId ?? "");
  if (!clientId) return;

  const quoteId = conversation.quoteId ? String(conversation.quoteId) : "";
  const quote = quoteId
    ? ((await QuoteRequestModel.findById(quoteId).select("quoteNumber email locale").lean()) as Doc | null)
    : null;

  // L'adresse vient du compte, pas de la demande : une conversation générale
  // n'est rattachée à aucun dossier, et l'adresse du compte est celle qui
  // reçoit.
  const account = await findAccount(clientId);

  const localeValue = String(quote?.locale ?? "");
  const locale: Locale = isLocale(localeValue) ? localeValue : defaultLocale;
  const conversationId = String(conversation._id);
  const reference = quote ? String(quote.quoteNumber ?? "") : "";

  const path = quoteId
    ? href("portalQuotes", locale, quoteId)
    : href("portalMessages", locale, conversationId);
  const url = quoteId
    ? publicUrl("portalQuotes", locale, quoteId)
    : publicUrl("portalMessages", locale, conversationId);

  await notify({
    userId: clientId,
    type: "new_message",
    title: reference ? `${reference} — ${excerptOf(String(conversation.subject ?? ""), 60)}` : String(conversation.subject ?? ""),
    href: path,
  });

  const email = account?.email || String(quote?.email ?? "");
  if (!email) return;

  await sendTransactionalEmail(
    email,
    newMessageEmail(locale, {
      subject: String(conversation.subject ?? ""),
      reference,
      url,
      forAdmin: false,
      senderName,
    }),
  );
}
