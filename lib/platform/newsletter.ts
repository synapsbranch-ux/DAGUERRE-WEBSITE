import { Types } from "mongoose";

import { renderEmail } from "@/lib/email/layout";
import { markdownToEmailBlocks } from "@/lib/email/markdown";
import { publicUrl, sendNewsletterEmail, sendTransactionalEmail } from "@/lib/email/service";
import { newsletterConfirmEmail, newsletterWelcomeEmail, type RenderedEmail } from "@/lib/email/templates";
import {
  NewsletterCampaignModel,
  NewsletterRecipientModel,
  NewsletterSubscriberModel,
} from "@/lib/db/models/platform";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import {
  mailableSubscriberStatuses,
  type CampaignAudience,
  type SubscriberSource,
  type SubscriberStatus,
} from "@/lib/platform/enums";
import type { PlatformFilter } from "@/lib/platform/filters";
import { CONFIRM_TTL_SECONDS, createToken, readToken, tokenPurpose } from "@/lib/platform/tokens";
import { isDuplicateKeyError } from "@/lib/platform/idempotency";

/**
 * Moteur d'infolettre.
 *
 * ## Consentement
 *
 * Un abonnement naît d'un geste explicite : case cochée, puis clic sur le lien
 * de confirmation. `consentAt` est posé à l'inscription, `confirmedAt` à la
 * confirmation. Aucun autre parcours du site n'abonne qui que ce soit.
 *
 * ## Désabonnement
 *
 * Le jeton est signé et permanent : un lien contenu dans un envoi vieux de
 * deux ans doit encore fonctionner. Le document n'est **pas** supprimé — sans
 * lui, une réinscription accidentelle par import repartirait de zéro et
 * l'ancien refus serait perdu.
 *
 * ## Envoi
 *
 * Une campagne fige d'abord la liste de ses destinataires, puis les traite par
 * lots. L'index unique `(campaignId, subscriberId)` interdit qu'un même
 * abonné soit inscrit deux fois dans la même campagne, quel que soit le nombre
 * de fois où l'envoi est relancé.
 */

type Doc = Record<string, unknown>;

/**
 * Nom du paramètre portant le jeton.
 *
 * Il voyage en requête plutôt qu'en segment de chemin : la table de routes
 * traduit déjà les segments d'une locale à l'autre, et un jeton n'a pas à
 * exister en deux variantes linguistiques.
 */
export const TOKEN_PARAM = "jeton";

/** URL de confirmation d'inscription, dans la langue de l'abonné. */
export function confirmUrl(subscriberId: string, locale: Locale): string {
  const token = createToken(tokenPurpose.newsletterConfirm, subscriberId, CONFIRM_TTL_SECONDS);
  return `${publicUrl("newsletterConfirm", locale)}?${TOKEN_PARAM}=${encodeURIComponent(token)}`;
}

/** URL de désabonnement — sans expiration, elle vit aussi longtemps que l'envoi. */
export function unsubscribeUrl(subscriberId: string, locale: Locale): string {
  const token = createToken(tokenPurpose.newsletterUnsubscribe, subscriberId);
  return `${publicUrl("newsletterUnsubscribe", locale)}?${TOKEN_PARAM}=${encodeURIComponent(token)}`;
}

export type SubscribeOutcome =
  | { result: "created" | "reconfirm"; confirmationSent: boolean }
  | { result: "already_active" }
  | { result: "error"; message: string };

/**
 * Inscription à l'infolettre.
 *
 * Une adresse déjà active n'est pas réécrite : renvoyer un courriel de
 * confirmation à quelqu'un d'abonné depuis un an serait au mieux déroutant.
 * Une adresse désabonnée qui se réinscrit repasse par la confirmation — son
 * refus antérieur ne se contourne pas d'un simple formulaire rempli par un
 * tiers.
 */
export async function subscribeToNewsletter(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  source: SubscriberSource;
  locale: Locale;
  userId?: string;
}): Promise<SubscribeOutcome> {
  const email = input.email.trim().toLowerCase();
  const now = new Date();

  const existing = (await NewsletterSubscriberModel.findOne({ email }).lean()) as Doc | null;

  if (existing && existing.status === "active") return { result: "already_active" };

  try {
    const doc = (await NewsletterSubscriberModel.findOneAndUpdate(
      { email },
      {
        $set: {
          status: "pending",
          source: input.source,
          locale: input.locale,
          consentAt: now,
          unsubscribedAt: null,
          lastError: "",
          ...(input.firstName ? { firstName: input.firstName } : {}),
          ...(input.lastName ? { lastName: input.lastName } : {}),
          ...(input.userId ? { userId: input.userId } : {}),
        },
        $setOnInsert: { email },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean()) as Doc | null;

    if (!doc) return { result: "error", message: "Enregistrement impossible." };

    const id = String(doc._id);
    const sent = await sendTransactionalEmail(
      email,
      newsletterConfirmEmail(input.locale, { confirmUrl: confirmUrl(id, input.locale) }),
    );

    return {
      result: existing ? "reconfirm" : "created",
      confirmationSent: sent.ok,
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) return { result: "already_active" };
    console.error("[newsletter] inscription impossible :", error);
    return { result: "error", message: "Enregistrement impossible." };
  }
}

export type ConfirmOutcome = { ok: true; email: string } | { ok: false; reason: "invalid" | "missing" };

/** Confirmation de l'inscription depuis le lien reçu par courriel. */
export async function confirmSubscription(token: string | null): Promise<ConfirmOutcome> {
  const id = readToken(tokenPurpose.newsletterConfirm, token);
  if (!id) return { ok: false, reason: "invalid" };

  const now = new Date();
  const doc = (await NewsletterSubscriberModel.findOneAndUpdate(
    { _id: id, status: { $in: ["pending", "unsubscribed"] } },
    { $set: { status: "active", confirmedAt: now, unsubscribedAt: null, lastActivityAt: now } },
    { new: true },
  ).lean()) as Doc | null;

  if (!doc) {
    // Déjà confirmé : le lien reste « valide » du point de vue de l'abonné.
    const current = (await NewsletterSubscriberModel.findById(id).lean()) as Doc | null;
    if (current?.status === "active") return { ok: true, email: String(current.email) };
    return { ok: false, reason: "missing" };
  }

  const locale = isLocale(String(doc.locale)) ? (String(doc.locale) as Locale) : defaultLocale;
  await sendTransactionalEmail(
    String(doc.email),
    newsletterWelcomeEmail(locale, {
      unsubscribeUrl: unsubscribeUrl(String(doc._id), locale),
      blogUrl: publicUrl("blog", locale),
    }),
  );

  return { ok: true, email: String(doc.email) };
}

export type UnsubscribeOutcome =
  | { ok: true; email: string; already: boolean }
  | { ok: false; reason: "invalid" };

/**
 * Désabonnement.
 *
 * Le statut passe à `unsubscribed` et `unsubscribedAt` est daté : le document
 * reste, la preuve du refus aussi. Les courriels transactionnels — devis,
 * projets, messages — ne sont pas concernés : ils relèvent du service, pas du
 * marketing.
 */
export async function unsubscribeByToken(token: string | null): Promise<UnsubscribeOutcome> {
  const id = readToken(tokenPurpose.newsletterUnsubscribe, token);
  if (!id) return { ok: false, reason: "invalid" };

  const current = (await NewsletterSubscriberModel.findById(id).lean()) as Doc | null;
  if (!current) return { ok: false, reason: "invalid" };

  if (current.status === "unsubscribed") {
    return { ok: true, email: String(current.email), already: true };
  }

  await NewsletterSubscriberModel.updateOne(
    { _id: id },
    { $set: { status: "unsubscribed", unsubscribedAt: new Date() } },
  );

  return { ok: true, email: String(current.email), already: false };
}

/* ------------------------------------------------------------------ */
/* Audiences                                                           */
/* ------------------------------------------------------------------ */

/**
 * Filtre d'audience.
 *
 * Il porte **toujours** la condition de statut : c'est la garantie qu'aucun
 * segment, présent ou futur, ne peut atteindre une adresse désabonnée, en
 * rejet dur ou ayant signalé un abus.
 */
export function audienceFilter(audience: CampaignAudience): PlatformFilter {
  const mailable: PlatformFilter = { status: { $in: [...mailableSubscriberStatuses] } };

  switch (audience) {
    case "locale_fr":
      return { ...mailable, locale: "fr" };
    case "locale_en":
      return { ...mailable, locale: "en" };
    case "clients":
      return { ...mailable, userId: { $nin: ["", null] } };
    case "non_clients":
      return { ...mailable, $or: [{ userId: "" }, { userId: null }, { userId: { $exists: false } }] };
    case "all_active":
    default:
      return mailable;
  }
}

export function countAudience(audience: CampaignAudience): Promise<number> {
  return NewsletterSubscriberModel.countDocuments(audienceFilter(audience));
}

/* ------------------------------------------------------------------ */
/* Rendu d'une campagne                                                */
/* ------------------------------------------------------------------ */

export type CampaignContent = {
  subject: string;
  previewText: string;
  content: string;
  locale: Locale;
};

/** Rend une campagne pour un abonné donné, lien de désabonnement inclus. */
export function renderCampaign(campaign: CampaignContent, unsubscribe: string): RenderedEmail {
  const rendered = renderEmail({
    locale: campaign.locale,
    title: campaign.subject,
    previewText: campaign.previewText,
    blocks: markdownToEmailBlocks(campaign.content),
    unsubscribeUrl: unsubscribe,
  });
  return { subject: campaign.subject, html: rendered.html, text: rendered.text };
}

export function campaignContentOf(doc: Doc): CampaignContent {
  const locale = String(doc.locale ?? "");
  return {
    subject: String(doc.subject ?? ""),
    previewText: String(doc.previewText ?? ""),
    content: String(doc.content ?? ""),
    locale: isLocale(locale) ? locale : defaultLocale,
  };
}

/* ------------------------------------------------------------------ */
/* Envoi                                                               */
/* ------------------------------------------------------------------ */

/** Taille d'un lot : compromis entre nombre d'appels et durée d'exécution. */
export const BATCH_SIZE = 20;

/**
 * Fige la liste des destinataires d'une campagne.
 *
 * `ordered: false` laisse l'insertion continuer après un doublon : relancer un
 * envoi interrompu réinsère les mêmes couples, la base refuse ceux qui
 * existent déjà, et les nouveaux abonnés éligibles s'ajoutent sans que
 * personne ne reçoive deux fois le message.
 */
export async function snapshotRecipients(campaignId: string, audience: CampaignAudience): Promise<number> {
  const subscribers = (await NewsletterSubscriberModel.find(audienceFilter(audience))
    .select("_id email")
    .lean()) as Doc[];

  if (subscribers.length === 0) return 0;

  const rows = subscribers.map((subscriber) => ({
    campaignId,
    subscriberId: subscriber._id,
    email: String(subscriber.email),
    status: "queued" as const,
  }));

  try {
    await NewsletterRecipientModel.insertMany(rows, { ordered: false });
  } catch (error) {
    // Les doublons sont attendus ; toute autre erreur remonte.
    if (!isDuplicateKeyError(error) && !(error as { writeErrors?: unknown[] }).writeErrors) throw error;
  }

  return NewsletterRecipientModel.countDocuments({ campaignId });
}

export type BatchResult = { processed: number; sent: number; failed: number; skipped: number; remaining: number };

/**
 * Traite un lot de destinataires.
 *
 * Chaque destinataire est **réservé** par une mise à jour conditionnelle sur
 * `status: "queued"` : deux exécutions concurrentes — un `after()` et un appel
 * de planificateur — ne peuvent pas envoyer au même abonné. Le statut de
 * l'abonné est revérifié juste avant l'envoi : un désabonnement survenu depuis
 * la constitution de la liste est respecté.
 */
export async function dispatchBatch(campaignId: string, size = BATCH_SIZE): Promise<BatchResult> {
  const campaign = (await NewsletterCampaignModel.findById(campaignId).lean()) as Doc | null;
  if (!campaign) return { processed: 0, sent: 0, failed: 0, skipped: 0, remaining: 0 };

  const content = campaignContentOf(campaign);
  const queued = (await NewsletterRecipientModel.find({ campaignId, status: "queued" })
    .limit(size)
    .lean()) as Doc[];

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const recipient of queued) {
    const claimed = await NewsletterRecipientModel.findOneAndUpdate(
      { _id: recipient._id, status: "queued" },
      { $set: { status: "sent", sentAt: new Date() } },
      { new: true },
    ).lean();
    if (!claimed) continue;

    const subscriber = (await NewsletterSubscriberModel.findById(recipient.subscriberId)
      .select("status locale email")
      .lean()) as Doc | null;

    const status = String(subscriber?.status ?? "") as SubscriberStatus;
    if (!subscriber || !mailableSubscriberStatuses.includes(status)) {
      await NewsletterRecipientModel.updateOne(
        { _id: recipient._id },
        { $set: { status: "skipped", sentAt: null, errorMessage: "Abonné non éligible au moment de l'envoi." } },
      );
      skipped += 1;
      continue;
    }

    const locale = isLocale(String(subscriber.locale)) ? (String(subscriber.locale) as Locale) : content.locale;
    const unsubscribe = unsubscribeUrl(String(subscriber._id), locale);
    const email = renderCampaign(content, unsubscribe);

    const outcome = await sendNewsletterEmail(String(subscriber.email), email, unsubscribe);

    if (outcome.ok) {
      await NewsletterRecipientModel.updateOne(
        { _id: recipient._id },
        { $set: { providerMessageId: outcome.id, errorMessage: "" } },
      );
      sent += 1;
    } else {
      await NewsletterRecipientModel.updateOne(
        { _id: recipient._id },
        { $set: { status: "failed", failedAt: new Date(), sentAt: null, errorMessage: outcome.error.slice(0, 500) } },
      );
      failed += 1;
    }
  }

  const remaining = await NewsletterRecipientModel.countDocuments({ campaignId, status: "queued" });
  return { processed: queued.length, sent, failed, skipped, remaining };
}

/**
 * Vide la file d'une campagne, lot après lot.
 *
 * Appelée en tâche de fond (`after()`) : la requête d'administration répond
 * immédiatement, l'envoi se poursuit derrière. Une plate-forme qui interrompt
 * les tâches de fond laisse la campagne en `sending` ; le point d'entrée de
 * planification la reprend là où elle s'est arrêtée.
 */
export async function dispatchCampaign(campaignId: string, maxBatches = 50): Promise<void> {
  for (let index = 0; index < maxBatches; index += 1) {
    const result = await dispatchBatch(campaignId);
    if (result.remaining === 0) break;
    if (result.processed === 0) break;
  }
  await finalizeCampaign(campaignId);
}

/** Marque la campagne terminée quand plus aucun destinataire n'est en file. */
export async function finalizeCampaign(campaignId: string): Promise<void> {
  const remaining = await NewsletterRecipientModel.countDocuments({ campaignId, status: "queued" });
  if (remaining > 0) return;

  const failed = await NewsletterRecipientModel.countDocuments({ campaignId, status: "failed" });
  const delivered = await NewsletterRecipientModel.countDocuments({
    campaignId,
    status: { $in: ["sent", "delivered"] },
  });

  await NewsletterCampaignModel.updateOne(
    { _id: campaignId, status: "sending" },
    {
      $set: {
        status: delivered === 0 && failed > 0 ? "failed" : "sent",
        sentAt: new Date(),
        lastError: delivered === 0 && failed > 0 ? "Aucun envoi n'a abouti." : "",
      },
    },
  );
}

export type CampaignStats = {
  recipients: number;
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  complained: number;
  skipped: number;
};

/** Statistiques réelles, comptées sur les destinataires — jamais estimées. */
export async function campaignStats(campaignId: string): Promise<CampaignStats> {
  const rows = (await NewsletterRecipientModel.aggregate([
    { $match: { campaignId: new Types.ObjectId(campaignId) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ])) as { _id: string; count: number }[];

  const by = new Map(rows.map((row) => [row._id, row.count]));
  const value = (key: string) => by.get(key) ?? 0;

  return {
    recipients: rows.reduce((sum, row) => sum + row.count, 0),
    queued: value("queued"),
    sent: value("sent"),
    delivered: value("delivered"),
    failed: value("failed"),
    bounced: value("bounced"),
    complained: value("complained"),
    skipped: value("skipped"),
  };
}
