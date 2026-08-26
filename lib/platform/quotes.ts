import {
  ConversationMessageModel,
  ConversationModel,
  QuoteActivityModel,
  QuoteRequestModel,
} from "@/lib/db/models/platform";
import { adminNotificationAddress, publicUrl, sendTransactionalEmail, adminUrl } from "@/lib/email/service";
import {
  informationRequestedEmail,
  quoteStatusEmail,
} from "@/lib/email/templates";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import {
  canTransitionQuote,
  labelOf,
  quoteStatusLabels,
  type QuoteActivityType,
  type QuoteStatus,
} from "@/lib/platform/enums";
import { notify } from "@/lib/platform/notifications";
import { href } from "@/lib/routes";

/**
 * Cycle de vie d'une demande de devis.
 *
 * Les règles métier vivent ici, pas dans les routes : trois points d'entrée
 * font évoluer un dossier — le tableau de bord, la décision du client, la
 * conversion en projet — et ils doivent tous respecter la même machine à
 * états, écrire le même historique et prévenir de la même façon.
 */

type Doc = Record<string, unknown>;

export type QuoteActor = { id: string; email: string; role: "admin" | "client" | "system" };

/** Locale de correspondance d'un dossier. */
export function quoteLocale(doc: Doc): Locale {
  const value = String(doc.locale ?? "");
  return isLocale(value) ? value : defaultLocale;
}

/** Écrit un fait dans l'historique du dossier. */
export async function logQuoteActivity(
  quoteId: string,
  type: QuoteActivityType,
  actor: QuoteActor,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await QuoteActivityModel.create({
      quoteId,
      type,
      actorId: actor.id,
      actorRole: actor.role,
      metadata,
    });
  } catch (error) {
    console.error("[devis] historique non écrit :", error);
  }
}

/**
 * Conversation rattachée à un dossier, créée au besoin.
 *
 * Elle n'existe que pour un dossier rattaché à un compte : sans compte, le
 * client n'a nulle part où lire une réponse, et l'échange se fait par
 * courriel jusqu'à ce qu'il réclame sa demande.
 */
export async function ensureQuoteConversation(quote: Doc): Promise<string | null> {
  const clientId = String(quote.userId ?? "");
  if (!clientId) return null;

  const quoteId = String(quote._id);
  const existing = (await ConversationModel.findOne({ quoteId, clientId }).select("_id").lean()) as Doc | null;
  if (existing) return String(existing._id);

  const created = await ConversationModel.create({
    clientId,
    context: "quote",
    quoteId,
    subject: `${String(quote.quoteNumber ?? "")} — ${String(quote.title ?? "")}`.trim(),
    status: "open",
    lastMessageAt: new Date(),
  });
  return String(created._id);
}

/**
 * Poste un message dans la conversation d'un dossier.
 *
 * Le compteur de non-lus du destinataire est incrémenté à l'écriture : le
 * recalculer à chaque affichage coûterait une agrégation sur toute la
 * conversation à chaque chargement de page.
 */
export async function postQuoteMessage(
  quote: Doc,
  body: string,
  sender: { id: string; name: string; role: "admin" | "client" },
): Promise<string | null> {
  const conversationId = await ensureQuoteConversation(quote);
  if (!conversationId) return null;

  await ConversationMessageModel.create({
    conversationId,
    senderId: sender.id,
    senderRole: sender.role,
    senderName: sender.name,
    body,
  });

  await ConversationModel.updateOne(
    { _id: conversationId },
    {
      $set: { lastMessageAt: new Date(), status: "open" },
      $inc: sender.role === "admin" ? { unreadForClient: 1 } : { unreadForAdmin: 1 },
    },
  );

  return conversationId;
}

export type StatusChange =
  | { ok: true; from: QuoteStatus; to: QuoteStatus }
  | { ok: false; reason: "not_found" | "invalid_transition" };

/**
 * Changement d'état d'une demande.
 *
 * La transition est validée **et** appliquée sous condition de l'état
 * courant : deux administrateurs qui cliquent en même temps ne peuvent pas
 * produire un enchaînement impossible, et une requête forgée ne peut pas
 * sauter d'« à l'étude » à « convertie en projet ».
 */
export async function changeQuoteStatus(
  quoteId: string,
  next: QuoteStatus,
  actor: QuoteActor,
  options: { message?: string; actorName?: string; skipNotification?: boolean } = {},
): Promise<StatusChange> {
  const quote = (await QuoteRequestModel.findById(quoteId).lean()) as Doc | null;
  if (!quote) return { ok: false, reason: "not_found" };

  const current = String(quote.status ?? "") as QuoteStatus;
  if (current === next) return { ok: true, from: current, to: next };
  if (!canTransitionQuote(current, next)) return { ok: false, reason: "invalid_transition" };

  const updated = await QuoteRequestModel.findOneAndUpdate(
    { _id: quoteId, status: current },
    { $set: { status: next } },
    { new: true },
  ).lean();
  if (!updated) return { ok: false, reason: "invalid_transition" };

  await logQuoteActivity(quoteId, next === "needs_information" ? "information_requested" : "status_changed", actor, {
    from: current,
    to: next,
  });

  if (options.message?.trim()) {
    await postQuoteMessage(quote, options.message.trim(), {
      id: actor.id,
      name: options.actorName ?? "",
      role: actor.role === "client" ? "client" : "admin",
    });
    await logQuoteActivity(quoteId, "message_sent", actor, {});
  }

  if (!options.skipNotification) await announceStatus(quote, next, Boolean(options.message?.trim()));

  return { ok: true, from: current, to: next };
}

/**
 * Prévient le client d'un changement d'état.
 *
 * Notification dans l'application **et** courriel : la première sert au client
 * qui se connecte, le second à celui qui ne se connecte jamais. Aucun des deux
 * ne transporte le contenu d'un message privé — seulement la référence et le
 * lien.
 */
async function announceStatus(quote: Doc, next: QuoteStatus, withMessage: boolean): Promise<void> {
  const locale = quoteLocale(quote);
  const quoteId = String(quote._id);
  const quoteNumber = String(quote.quoteNumber ?? "");
  const clientId = String(quote.userId ?? "");
  const path = href("portalQuotes", locale, quoteId);
  const url = publicUrl("portalQuotes", locale, quoteId);

  if (clientId) {
    await notify({
      userId: clientId,
      type: next === "needs_information" ? "information_requested" : "quote_updated",
      title: `${quoteNumber} — ${labelOf(quoteStatusLabels, next, locale)}`,
      message: withMessage ? "" : String(quote.title ?? ""),
      href: path,
    });
  }

  const email = String(quote.email ?? "");
  if (!email) return;

  await sendTransactionalEmail(
    email,
    next === "needs_information"
      ? informationRequestedEmail(locale, { quoteNumber, url })
      : quoteStatusEmail(locale, {
          quoteNumber,
          statusLabel: labelOf(quoteStatusLabels, next, locale),
          url,
        }),
  );
}

/** Adresse d'alerte de l'administration, si elle est configurée. */
export function adminAlertTarget(): string | null {
  return adminNotificationAddress();
}

/** Lien du tableau de bord vers un dossier. */
export function adminQuoteUrl(quoteId: string): string {
  return adminUrl(`/admin/devis/${quoteId}`);
}
