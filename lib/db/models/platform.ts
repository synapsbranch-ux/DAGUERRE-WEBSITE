import { Schema, model, models, type Model } from "mongoose";

import { schemaOptions, localizedString } from "@/lib/db/models/shared";
import {
  campaignAudiences,
  campaignStatuses,
  clientProjectStatuses,
  conversationContexts,
  conversationStatuses,
  currencies,
  fileVisibilities,
  notificationTypes,
  proposalStatuses,
  quoteActivityTypes,
  quotePriorities,
  quoteStatuses,
  recipientStatuses,
  invoiceStatuses,
  paymentMethods,
  contractSources,
  contractStatuses,
  signerStatuses,
  signatureModes,
  eventKinds,
  bookingStatuses,
  meetingLocations,
  resourceTypes,
  resourceVisibilities,
  roles,
  subscriberSources,
  subscriberStatuses,
} from "@/lib/platform/enums";

/**
 * Modèles de la plate-forme client.
 *
 * Ils prolongent le CMS éditorial (`lib/db/models/index.ts`) sans le modifier :
 * mêmes options de schéma, même connexion Mongoose, même bibliothèque de
 * médias. Ce fichier ne contient que ce qu'un portfolio n'avait pas besoin de
 * savoir — abonnés, devis, propositions, projets, conversations.
 *
 * ## Références vers les comptes
 *
 * Les comptes appartiennent à **Logto**, pas à cette base. Un `userId` est donc
 * un sujet Logto (`sub`) : une chaîne courte, ni un `ObjectId` ni un UUID. Les
 * champs qui le portent sont des `String`, ce qu'ils étaient déjà — un
 * `Schema.Types.ObjectId` lèverait sur chaque valeur.
 *
 * `AppUser` en est le miroir local : un **cache d'affichage** alimenté par les
 * notifications de Logto, qui permet de lister et de rechercher des comptes
 * sans interroger le fournisseur à chaque ligne de tableau. Aucune décision
 * d'accès ne le lit : l'autorité reste la revendication signée du jeton.
 *
 * ## Montants
 *
 * Les sommes sont stockées en **unités mineures entières** (centimes,
 * centavos, centimes de gourde). Un `Number` à virgule flottante accumule des
 * erreurs dès la première multiplication quantité × prix unitaire ; l'entier
 * est exact et se formate à l'affichage avec `Intl.NumberFormat`.
 */

/**
 * Enregistre un modèle une seule fois.
 *
 * `PlatformDoc` remplace l'inférence de type que Mongoose ferait à partir de
 * chaque définition de schéma. Cette inférence est extraordinairement coûteuse
 * — dix-neuf schémas suffisent à faire dépasser la limite de mémoire à
 * `tsc` — pour un bénéfice nul ici : les lectures passent par `.lean()` et
 * sont typées à l'usage, et c'est Zod qui valide les écritures.
 */
export type PlatformDoc = Record<string, unknown>;

function define(name: string, schema: Schema): Model<PlatformDoc> {
  return (models[name] as Model<PlatformDoc> | undefined) ?? model<PlatformDoc>(name, schema);
}

const userRef = { type: String, trim: true, default: "" };
const money = { type: Number, min: 0, max: 1_000_000_000_000, default: 0 };

/* ------------------------------------------------------------------ */
/* Compteurs de numérotation                                           */
/* ------------------------------------------------------------------ */

/**
 * Séquences atomiques pour les identifiants lisibles (`DQ-2026-000123`).
 *
 * Un `findOneAndUpdate` avec `$inc` est atomique côté serveur MongoDB : deux
 * demandes simultanées ne peuvent pas obtenir le même numéro, là où un
 * `count() + 1` en produirait des doublons sous charge.
 */
const counterSchema = new Schema<PlatformDoc>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
  },
  schemaOptions,
);
export const CounterModel = define("PlatformCounter", counterSchema);

/* ------------------------------------------------------------------ */
/* Miroir des comptes Logto                                            */
/* ------------------------------------------------------------------ */

/**
 * Copie locale des comptes détenus par Logto.
 *
 * Elle existe pour une seule raison : le tableau de bord doit lister, chercher
 * et paginer des comptes, y compris ceux que personne n'a jamais ouverts.
 * Interroger la Management API à chaque ligne de tableau ferait dépendre chaque
 * page d'administration de la disponibilité de Logto, et multiplierait les
 * requêtes réseau.
 *
 * **Ce miroir n'a aucune autorité.** Le `role` qu'il conserve sert à trier et à
 * filtrer une liste ; il n'ouvre aucune porte. Un accès se décide toujours sur
 * la revendication signée du jeton, jamais ici — sans quoi une ligne modifiée
 * en base suffirait à fabriquer un administrateur.
 *
 * Alimenté par les notifications de Logto (`app/api/webhooks/logto/route.ts`)
 * et par `scripts/sync-logto-users.mjs` pour le remplissage initial.
 */
const appUserSchema = new Schema<PlatformDoc>(
  {
    logtoId: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "", index: true },
    name: { type: String, trim: true, default: "" },
    role: { type: String, enum: roles, default: "customer", index: true },
    isSuspended: { type: Boolean, default: false },
    /*
     * Un compte supprimé dans Logto est marqué, pas effacé : ses devis, ses
     * messages et ses factures continuent d'exister et doivent rester
     * attribuables à un nom dans l'historique.
     */
    deletedAt: { type: Date, default: null },
    syncedAt: { type: Date, default: null },
  },
  schemaOptions,
);
appUserSchema.index({ role: 1, createdAt: -1 });
export const AppUserModel = define("AppUser", appUserSchema);

/* ------------------------------------------------------------------ */
/* Profil client                                                       */
/* ------------------------------------------------------------------ */

/**
 * Fiche client rattachée à un compte.
 *
 * Tous les champs métier sont facultatifs : la création de compte se fait chez
 * Logto et ne demande qu'une adresse, le reste se complète progressivement
 * depuis l'espace client. Exiger la raison sociale à l'inscription ferait fuir
 * les prospects qui veulent seulement suivre un devis.
 */
const clientProfileSchema = new Schema<PlatformDoc>(
  {
    userId: { type: String, required: true, unique: true },
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    companyName: { type: String, trim: true, default: "" },
    jobTitle: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    preferredLanguage: { type: String, enum: ["fr", "en"], default: "fr" },
    industry: { type: String, trim: true, default: "" },
    companySize: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    avatar: { type: String, trim: true, default: "" },
  },
  schemaOptions,
);
export const ClientProfileModel = define("ClientProfile", clientProfileSchema);

/* ------------------------------------------------------------------ */
/* Infolettre                                                          */
/* ------------------------------------------------------------------ */

/**
 * Abonné à l'infolettre.
 *
 * `email` est normalisé en minuscules **et** unique : c'est la seule garantie
 * qu'une double inscription ne crée pas deux enregistrements divergents dont
 * l'un resterait abonné après un désabonnement.
 *
 * `consentAt` matérialise le consentement explicite exigé pour toute
 * communication commerciale ; il n'est jamais posé par un autre parcours
 * (création de compte, devis, téléchargement) sans case cochée.
 */
const newsletterSubscriberSchema = new Schema<PlatformDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    userId: userRef,
    status: { type: String, enum: subscriberStatuses, default: "pending", index: true },
    source: { type: String, enum: subscriberSources, default: "homepage", index: true },
    locale: { type: String, enum: ["fr", "en"], default: "fr", index: true },
    consentAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    unsubscribedAt: { type: Date, default: null },
    lastActivityAt: { type: Date, default: null },
    /** Dernier motif d'échec rapporté par le fournisseur d'envoi. */
    lastError: { type: String, trim: true, default: "" },
  },
  schemaOptions,
);
newsletterSubscriberSchema.index({ status: 1, createdAt: -1 });
export const NewsletterSubscriberModel = define("NewsletterSubscriber", newsletterSubscriberSchema);

const newsletterCampaignSchema = new Schema<PlatformDoc>(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    previewText: { type: String, trim: true, default: "" },
    /** Corps en Markdown, converti en HTML compatible courriel à l'envoi. */
    content: { type: String, default: "" },
    locale: { type: String, enum: ["fr", "en"], default: "fr" },
    status: { type: String, enum: campaignStatuses, default: "draft", index: true },
    audienceType: { type: String, enum: campaignAudiences, default: "all_active" },
    createdById: userRef,
    scheduledAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    /** Nombre de destinataires figés au moment du lancement. */
    recipientCount: { type: Number, default: 0 },
    lastError: { type: String, trim: true, default: "" },
  },
  schemaOptions,
);
newsletterCampaignSchema.index({ status: 1, updatedAt: -1 });
export const NewsletterCampaignModel = define("NewsletterCampaign", newsletterCampaignSchema);

/**
 * Destinataire d'une campagne.
 *
 * L'index unique `(campaignId, subscriberId)` **est** le mécanisme
 * d'idempotence : un rafraîchissement de page ou une reprise après incident
 * réinsère les mêmes couples, la base les refuse, personne ne reçoit deux
 * fois le même courriel.
 */
const newsletterRecipientSchema = new Schema<PlatformDoc>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: "NewsletterCampaign", required: true, index: true },
    subscriberId: { type: Schema.Types.ObjectId, ref: "NewsletterSubscriber", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    status: { type: String, enum: recipientStatuses, default: "queued", index: true },
    providerMessageId: { type: String, trim: true, default: "" },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    openedAt: { type: Date, default: null },
    clickedAt: { type: Date, default: null },
    bouncedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    errorMessage: { type: String, trim: true, default: "" },
  },
  schemaOptions,
);
newsletterRecipientSchema.index({ campaignId: 1, subscriberId: 1 }, { unique: true });
newsletterRecipientSchema.index({ campaignId: 1, status: 1 });
export const NewsletterRecipientModel = define("NewsletterCampaignRecipient", newsletterRecipientSchema);

/* ------------------------------------------------------------------ */
/* Bibliothèque de ressources                                          */
/* ------------------------------------------------------------------ */

const resourceCategorySchema = new Schema<PlatformDoc>(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: localizedString(true),
    description: localizedString(),
    order: { type: Number, default: 0 },
  },
  schemaOptions,
);
export const ResourceCategoryModel = define("ResourceCategory", resourceCategorySchema);

const contentResourceSchema = new Schema<PlatformDoc>(
  {
    slug: localizedString(true),
    title: localizedString(true),
    description: localizedString(),
    body: localizedString(),
    type: { type: String, enum: resourceTypes, default: "pdf" },
    visibility: { type: String, enum: resourceVisibilities, default: "public", index: true },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    coverImage: { type: String, trim: true, default: "" },
    /** Fichier privé servi par `/api/files/[id]`. */
    fileId: { type: Schema.Types.ObjectId, ref: "StoredFile", default: null },
    /** Ressource hébergée ailleurs — exclusive du fichier téléversé. */
    externalUrl: { type: String, trim: true, default: "" },
    categoryId: { type: Schema.Types.ObjectId, ref: "ResourceCategory", default: null, index: true },
    authorId: userRef,
    /** Comptes explicitement autorisés quand `visibility === "private"`. */
    allowedUserIds: { type: [String], default: [] },
    downloadCount: { type: Number, default: 0 },
    publishedAt: { type: Date, default: null },
  },
  schemaOptions,
);
contentResourceSchema.index({ "slug.fr": 1 }, { unique: true });
contentResourceSchema.index({ status: 1, visibility: 1, publishedAt: -1 });
export const ContentResourceModel = define("ContentResource", contentResourceSchema);

const contentDownloadSchema = new Schema<PlatformDoc>(
  {
    resourceId: { type: Schema.Types.ObjectId, ref: "ContentResource", required: true, index: true },
    userId: userRef,
    subscriberId: { type: Schema.Types.ObjectId, ref: "NewsletterSubscriber", default: null },
    downloadedAt: { type: Date, default: () => new Date(), index: true },
  },
  schemaOptions,
);
export const ContentDownloadModel = define("ContentDownload", contentDownloadSchema);

/* ------------------------------------------------------------------ */
/* Fichiers privés                                                     */
/* ------------------------------------------------------------------ */

/**
 * Métadonnées d'un fichier stocké dans le bucket GridFS privé.
 *
 * Le binaire n'est **jamais** dans ce document : seule la clé de stockage
 * (`gridFsFileId`) y figure, et cette clé ne quitte jamais le serveur. Le
 * client ne connaît que `/api/files/<_id>`, qui contrôle les droits avant de
 * servir un octet.
 */
const storedFileSchema = new Schema<PlatformDoc>(
  {
    filename: { type: String, required: true, trim: true },
    originalFilename: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
    gridFsFileId: { type: Schema.Types.ObjectId, required: true },
    visibility: { type: String, enum: fileVisibilities, default: "admin_only", index: true },
    /** Propriétaire quand la portée est `specific_client`. */
    ownerUserId: userRef,
    quoteRequestId: { type: Schema.Types.ObjectId, ref: "QuoteRequest", default: null, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "ClientProject", default: null, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", default: null, index: true },
    label: { type: String, trim: true, default: "" },
    uploadedBy: userRef,
  },
  schemaOptions,
);
export const StoredFileModel = define("StoredFile", storedFileSchema);

/* ------------------------------------------------------------------ */
/* Devis                                                               */
/* ------------------------------------------------------------------ */

const quoteRequestSchema = new Schema<PlatformDoc>(
  {
    quoteNumber: { type: String, required: true, unique: true, trim: true },
    userId: { ...userRef, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    /** Service du CMS, quand la demande se rattache à une offre publiée. */
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", default: null },
    /** Repli libre lorsque aucun service ne correspond. */
    serviceType: { type: String, trim: true, default: "other" },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    businessObjective: { type: String, default: "" },
    dataSources: { type: String, default: "" },
    estimatedDataVolume: { type: String, trim: true, default: "" },
    desiredDeliverables: { type: String, default: "" },
    budgetRange: { type: String, trim: true, default: "" },
    desiredStartDate: { type: Date, default: null },
    deadline: { type: Date, default: null },
    locale: { type: String, enum: ["fr", "en"], default: "fr" },
    status: { type: String, enum: quoteStatuses, default: "submitted", index: true },
    priority: { type: String, enum: quotePriorities, default: "normal", index: true },
    assignedToId: userRef,
    clientViewedAt: { type: Date, default: null },
    adminViewedAt: { type: Date, default: null },
    projectId: { type: Schema.Types.ObjectId, ref: "ClientProject", default: null },
    /**
     * Empreinte de soumission — voir `lib/platform/idempotency.ts`.
     * L'index unique partiel ignore les documents anciens qui n'en portent pas.
     */
    submissionKey: { type: String, trim: true, default: "" },
  },
  schemaOptions,
);
quoteRequestSchema.index({ status: 1, createdAt: -1 });
quoteRequestSchema.index({ userId: 1, createdAt: -1 });
quoteRequestSchema.index(
  { submissionKey: 1 },
  { unique: true, partialFilterExpression: { submissionKey: { $type: "string", $gt: "" } } },
);
export const QuoteRequestModel = define("QuoteRequest", quoteRequestSchema);

/**
 * Événement du dossier.
 *
 * L'historique ne se déduit pas de `updatedAt` : une seule date ne dit ni
 * quand le devis a été transmis, ni qui a changé quoi. Chaque fait notable
 * s'écrit ici, une fois, et n'est jamais modifié.
 */
const quoteActivitySchema = new Schema<PlatformDoc>(
  {
    quoteId: { type: Schema.Types.ObjectId, ref: "QuoteRequest", required: true, index: true },
    type: { type: String, enum: quoteActivityTypes, required: true },
    actorId: userRef,
    actorRole: { type: String, enum: ["admin", "customer", "system"], default: "system" },
    /** Contexte structuré : ancien et nouveau statut, numéro de version… */
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  schemaOptions,
);
quoteActivitySchema.index({ quoteId: 1, createdAt: 1 });
export const QuoteActivityModel = define("QuoteActivity", quoteActivitySchema);

/**
 * Note interne.
 *
 * Collection **séparée** des messages client : aucune requête de l'espace
 * client ne la lit, donc aucune erreur de filtre ne peut la divulguer. Un
 * simple booléen `internal` sur les messages aurait suffi jusqu'au jour où un
 * `find()` oublie la condition.
 */
const quoteNoteSchema = new Schema<PlatformDoc>(
  {
    quoteId: { type: Schema.Types.ObjectId, ref: "QuoteRequest", required: true, index: true },
    authorId: userRef,
    authorName: { type: String, trim: true, default: "" },
    body: { type: String, required: true },
  },
  schemaOptions,
);
export const QuoteNoteModel = define("QuoteNote", quoteNoteSchema);

const proposalItemSchema = new Schema<PlatformDoc>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 0, max: 100_000 },
    /** Prix unitaire en unités mineures. */
    unitPrice: money,
    /** Montant ligne en unités mineures, recalculé côté serveur. */
    amount: money,
    position: { type: Number, default: 0 },
  },
  { _id: false },
);

const quoteProposalSchema = new Schema<PlatformDoc>(
  {
    quoteRequestId: { type: Schema.Types.ObjectId, ref: "QuoteRequest", required: true, index: true },
    version: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: "" },
    currency: { type: String, enum: currencies, default: "CAD" },
    items: { type: [proposalItemSchema], default: [] },
    subtotal: money,
    discount: money,
    tax: money,
    total: money,
    validUntil: { type: Date, default: null },
    terms: { type: String, default: "" },
    status: { type: String, enum: proposalStatuses, default: "draft", index: true },
    createdById: userRef,
    sentAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    acceptedBy: userRef,
    declinedAt: { type: Date, default: null },
    declineReason: { type: String, default: "" },
  },
  schemaOptions,
);
quoteProposalSchema.index({ quoteRequestId: 1, version: 1 }, { unique: true });
export const QuoteProposalModel = define("QuoteProposal", quoteProposalSchema);

/* ------------------------------------------------------------------ */
/* Conversations                                                       */
/* ------------------------------------------------------------------ */

const conversationSchema = new Schema<PlatformDoc>(
  {
    clientId: { type: String, required: true, index: true },
    context: { type: String, enum: conversationContexts, default: "general" },
    quoteId: { type: Schema.Types.ObjectId, ref: "QuoteRequest", default: null, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "ClientProject", default: null, index: true },
    subject: { type: String, trim: true, default: "" },
    status: { type: String, enum: conversationStatuses, default: "open", index: true },
    lastMessageAt: { type: Date, default: () => new Date(), index: true },
    /** Compteurs de non-lus, tenus à jour à chaque envoi et à chaque lecture. */
    unreadForClient: { type: Number, default: 0 },
    unreadForAdmin: { type: Number, default: 0 },
  },
  schemaOptions,
);
conversationSchema.index({ clientId: 1, lastMessageAt: -1 });
export const ConversationModel = define("Conversation", conversationSchema);

/**
 * Message d'une conversation.
 *
 * `body` est du **texte brut** : il est échappé au rendu et jamais interprété
 * comme du HTML. Un client ne doit pas pouvoir injecter de balise dans la
 * boîte de réception de l'administration.
 */
const conversationMessageSchema = new Schema<PlatformDoc>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    senderId: { type: String, required: true },
    senderRole: { type: String, enum: ["admin", "customer"], required: true },
    senderName: { type: String, trim: true, default: "" },
    body: { type: String, required: true },
    attachments: { type: [{ type: Schema.Types.ObjectId, ref: "StoredFile" }], default: [] },
    editedAt: { type: Date, default: null },
  },
  schemaOptions,
);
conversationMessageSchema.index({ conversationId: 1, createdAt: 1 });
export const ConversationMessageModel = define("ConversationMessage", conversationMessageSchema);

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

const notificationSchema = new Schema<PlatformDoc>(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: notificationTypes, required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: "" },
    /** Chemin interne de l'espace client — jamais une URL absolue arbitraire. */
    href: { type: String, trim: true, default: "" },
    readAt: { type: Date, default: null },
  },
  schemaOptions,
);
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
export const NotificationModel = define("Notification", notificationSchema);

/* ------------------------------------------------------------------ */
/* Projets clients                                                     */
/* ------------------------------------------------------------------ */

const clientProjectSchema = new Schema<PlatformDoc>(
  {
    projectNumber: { type: String, required: true, unique: true, trim: true },
    clientId: { type: String, required: true, index: true },
    quoteRequestId: { type: Schema.Types.ObjectId, ref: "QuoteRequest", default: null },
    proposalId: { type: Schema.Types.ObjectId, ref: "QuoteProposal", default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: clientProjectStatuses, default: "planned", index: true },
    startDate: { type: Date, default: null },
    targetDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  schemaOptions,
);
clientProjectSchema.index({ clientId: 1, createdAt: -1 });
export const ClientProjectModel = define("ClientProject", clientProjectSchema);

/** Note d'avancement publiée par l'administration et visible du client. */
const clientProjectUpdateSchema = new Schema<PlatformDoc>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "ClientProject", required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    authorId: userRef,
  },
  schemaOptions,
);
export const ClientProjectUpdateModel = define("ClientProjectUpdate", clientProjectUpdateSchema);

/* ------------------------------------------------------------------ */
/* Journal d'administration                                            */
/* ------------------------------------------------------------------ */

/**
 * Trace des actions administratives sensibles.
 *
 * `metadata` ne reçoit que des données structurées non secrètes : jamais de
 * mot de passe, de jeton, ni le corps d'un message privé.
 */
const adminAuditLogSchema = new Schema<PlatformDoc>(
  {
    actorId: userRef,
    actorEmail: { type: String, trim: true, default: "" },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, trim: true, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  schemaOptions,
);
adminAuditLogSchema.index({ createdAt: -1 });
export const AdminAuditLogModel = define("AdminAuditLog", adminAuditLogSchema);

/* ------------------------------------------------------------------ */
/* Réglages de facturation                                             */
/* ------------------------------------------------------------------ */

/**
 * Identité fiscale de l'émetteur et valeurs par défaut des factures.
 *
 * Séparée des réglages du site : une raison sociale, une adresse de
 * facturation et des numéros d'inscription aux taxes ne se modifient ni au même
 * rythme ni par les mêmes mains qu'un texte d'accueil. Aucun taux n'est codé en
 * dur — la TPS, la TVQ ou toute autre taxe se saisissent ici.
 *
 * Ces valeurs ne servent qu'à **préremplir** une nouvelle facture : une fois
 * émise, la facture porte sa propre copie. Changer le taux l'an prochain ne
 * réécrit rien de ce qui est parti.
 */
const billingTaxSchema = new Schema<PlatformDoc>(
  {
    label: { type: String, required: true, trim: true },
    /**
     * Taux en parties par million : 9,975 % vaut 99 750.
     *
     * Les points de base ne suffisent pas — 9,975 % y vaudrait 997,5, un
     * nombre à virgule, ce qui ruinerait l'argument même de l'arithmétique
     * entière. La TVQ impose cette précision au millième de pour cent.
     */
    ratePpm: { type: Number, required: true, min: 0, max: 1_000_000 },
    registration: { type: String, trim: true, default: "" },
    position: { type: Number, default: 0 },
  },
  { _id: false },
);

const billingSettingsSchema = new Schema<PlatformDoc>(
  {
    key: { type: String, default: "billing", unique: true },
    legalName: { type: String, trim: true, default: "" },
    address: { type: String, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    defaultCurrency: { type: String, enum: currencies, default: "CAD" },
    /** Délai de paiement appliqué par défaut à une nouvelle facture. */
    paymentTermsDays: { type: Number, default: 30, min: 0, max: 365 },
    taxes: { type: [billingTaxSchema], default: [] },
    defaultTerms: { type: String, default: "" },
    defaultNotes: { type: String, default: "" },
  },
  schemaOptions,
);
export const BillingSettingsModel = define("BillingSettings", billingSettingsSchema);

/* ------------------------------------------------------------------ */
/* Factures                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ligne de taxe appliquée à une facture.
 *
 * Les taxes sont **copiées dans la facture** au moment de son émission, pas
 * référencées. Un taux de TVQ qui change l'an prochain ne doit pas réécrire
 * rétroactivement une facture déjà envoyée : ce que le client a reçu doit
 * rester ce que la base contient.
 */
const invoiceTaxSchema = new Schema<PlatformDoc>(
  {
    label: { type: String, required: true, trim: true },
    /** Taux en parties par million : 5 % vaut 50 000. Entier, donc exact. */
    ratePpm: { type: Number, required: true, min: 0, max: 1_000_000 },
    /** Montant calculé en unités mineures, figé à l'émission. */
    amount: money,
    registration: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const invoiceSchema = new Schema<PlatformDoc>(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    clientId: { ...userRef, index: true },
    /** Coordonnées figées : le client peut changer d'adresse après coup. */
    billTo: {
      name: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, lowercase: true, default: "" },
      company: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
    },
    quoteRequestId: { type: Schema.Types.ObjectId, ref: "QuoteRequest", default: null, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "ClientProject", default: null, index: true },
    status: { type: String, enum: invoiceStatuses, default: "draft", index: true },
    currency: { type: String, enum: currencies, default: "CAD" },
    items: { type: [proposalItemSchema], default: [] },
    subtotal: money,
    discount: money,
    taxes: { type: [invoiceTaxSchema], default: [] },
    total: money,
    /** Somme des paiements enregistrés, tenue à jour à chaque écriture. */
    amountPaid: money,
    issuedAt: { type: Date, default: null },
    dueAt: { type: Date, default: null, index: true },
    paidAt: { type: Date, default: null },
    notes: { type: String, default: "" },
    terms: { type: String, default: "" },
    locale: { type: String, enum: ["fr", "en"], default: "fr" },
    createdById: userRef,
    /** PDF scellé, produit à l'émission et jamais régénéré ensuite. */
    documentFileId: { type: Schema.Types.ObjectId, ref: "StoredFile", default: null },
  },
  schemaOptions,
);
invoiceSchema.index({ clientId: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueAt: 1 });
export const InvoiceModel = define("Invoice", invoiceSchema);

/**
 * Paiement reçu sur une facture.
 *
 * Table séparée plutôt qu'un simple champ « payé » : un client peut régler en
 * plusieurs fois, et chaque encaissement doit garder sa date, son moyen et sa
 * référence. Le total de la facture s'en déduit, il ne le remplace pas.
 */
const invoicePaymentSchema = new Schema<PlatformDoc>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true, index: true },
    amount: money,
    method: { type: String, enum: paymentMethods, default: "transfer" },
    reference: { type: String, trim: true, default: "" },
    receivedAt: { type: Date, default: () => new Date() },
    note: { type: String, default: "" },
    recordedById: userRef,
  },
  schemaOptions,
);
export const InvoicePaymentModel = define("InvoicePayment", invoicePaymentSchema);

/* ------------------------------------------------------------------ */
/* Contrats et signature électronique                                  */
/* ------------------------------------------------------------------ */

/**
 * Contrat soumis à signature.
 *
 * Deux origines : rédigé ici en Markdown, ou déposé en PDF. Dans les deux cas
 * l'empreinte SHA-256 du document **présenté aux signataires** est figée à
 * l'envoi : c'est elle qui permet de prouver, plus tard, que le document signé
 * est bien celui qui a été soumis.
 */
const contractSchema = new Schema<PlatformDoc>(
  {
    contractNumber: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    source: { type: String, enum: contractSources, default: "generated" },
    /** Corps en Markdown, quand le contrat est rédigé ici. */
    body: { type: String, default: "" },
    /** PDF d'origine, quand il est déposé. */
    sourceFileId: { type: Schema.Types.ObjectId, ref: "StoredFile", default: null },
    /** PDF réellement soumis à signature — figé à l'envoi. */
    presentedFileId: { type: Schema.Types.ObjectId, ref: "StoredFile", default: null },
    /** PDF final, signatures et page d'audit incluses. */
    sealedFileId: { type: Schema.Types.ObjectId, ref: "StoredFile", default: null },
    /** Empreinte du document présenté, en hexadécimal. */
    documentHash: { type: String, trim: true, default: "" },
    status: { type: String, enum: contractStatuses, default: "draft", index: true },
    clientId: { ...userRef, index: true },
    quoteRequestId: { type: Schema.Types.ObjectId, ref: "QuoteRequest", default: null },
    projectId: { type: Schema.Types.ObjectId, ref: "ClientProject", default: null },
    message: { type: String, default: "" },
    locale: { type: String, enum: ["fr", "en"], default: "fr" },
    sentAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
    createdById: userRef,
  },
  schemaOptions,
);
contractSchema.index({ status: 1, createdAt: -1 });
export const ContractModel = define("Contract", contractSchema);

/**
 * Partie appelée à signer.
 *
 * `email` est la seule identité exigée : un signataire n'a pas besoin de
 * compte. Ce qui l'autorise, c'est un jeton signé qui le désigne — d'où
 * l'importance de `tokenVersion` : révoquer un lien, c'est l'incrémenter.
 *
 * `ip` et `userAgent` ne sont pas de la télémétrie : ce sont les éléments de
 * la piste d'audit qui donnent sa valeur probante à une signature simple.
 */
const contractSignerSchema = new Schema<PlatformDoc>(
  {
    contractId: { type: Schema.Types.ObjectId, ref: "Contract", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: { type: String, trim: true, default: "" },
    /** Ordre d'apposition ; 0 signifie « sans ordre imposé ». */
    order: { type: Number, default: 0 },
    status: { type: String, enum: signerStatuses, default: "pending", index: true },
    mode: { type: String, enum: signatureModes, default: "typed" },
    /** Nom saisi, ou tracé encodé en PNG base64. */
    signatureValue: { type: String, default: "" },
    consentedAt: { type: Date, default: null },
    viewedAt: { type: Date, default: null },
    signedAt: { type: Date, default: null },
    declinedAt: { type: Date, default: null },
    declineReason: { type: String, default: "" },
    ip: { type: String, trim: true, default: "" },
    userAgent: { type: String, trim: true, default: "" },
    /** Incrémenté pour révoquer les liens déjà envoyés. */
    tokenVersion: { type: Number, default: 1 },
    remindedAt: { type: Date, default: null },
  },
  schemaOptions,
);
contractSignerSchema.index({ contractId: 1, email: 1 }, { unique: true });
export const ContractSignerModel = define("ContractSigner", contractSignerSchema);

/* ------------------------------------------------------------------ */
/* Agenda                                                              */
/* ------------------------------------------------------------------ */

/**
 * Entrée d'agenda.
 *
 * Les instants sont stockés en UTC — un `Date` MongoDB l'est toujours. Le
 * fuseau n'apparaît qu'à l'affichage et au calcul des créneaux : mélanger les
 * deux est la source classique du rendez-vous décalé d'une heure au passage à
 * l'heure d'été.
 */
const calendarEventSchema = new Schema<PlatformDoc>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    kind: { type: String, enum: eventKinds, default: "meeting", index: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    location: { type: String, trim: true, default: "" },
    clientId: userRef,
    quoteRequestId: { type: Schema.Types.ObjectId, ref: "QuoteRequest", default: null },
    projectId: { type: Schema.Types.ObjectId, ref: "ClientProject", default: null },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    createdById: userRef,
  },
  schemaOptions,
);
calendarEventSchema.index({ startAt: 1, endAt: 1 });
export const CalendarEventModel = define("CalendarEvent", calendarEventSchema);

/**
 * Plage de disponibilité hebdomadaire.
 *
 * Les minutes sont comptées depuis minuit **dans le fuseau de référence**, ce
 * qui rend la règle stable au changement d'heure : « 9 h à 17 h » reste 9 h à
 * 17 h locales toute l'année, ce qu'un décalage fixe en UTC ne saurait faire.
 */
const availabilityRuleSchema = new Schema<PlatformDoc>(
  {
    /** 0 = dimanche, conformément à `Date.getDay()`. */
    weekday: { type: Number, required: true, min: 0, max: 6, index: true },
    startMinute: { type: Number, required: true, min: 0, max: 1440 },
    endMinute: { type: Number, required: true, min: 0, max: 1440 },
    active: { type: Boolean, default: true },
  },
  schemaOptions,
);
export const AvailabilityRuleModel = define("AvailabilityRule", availabilityRuleSchema);

/** Type de rencontre proposé à la réservation. */
const meetingTypeSchema = new Schema<PlatformDoc>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: localizedString,
    description: localizedString,
    durationMinutes: { type: Number, required: true, min: 5, max: 480 },
    /** Marges avant et après, pour ne pas enchaîner sans respirer. */
    bufferBefore: { type: Number, default: 0, min: 0, max: 240 },
    bufferAfter: { type: Number, default: 0, min: 0, max: 240 },
    /** Délai minimal avant le premier créneau réservable. */
    minNoticeHours: { type: Number, default: 12, min: 0, max: 720 },
    /** Horizon de réservation, en jours. */
    maxDaysAhead: { type: Number, default: 60, min: 1, max: 365 },
    location: { type: String, enum: meetingLocations, default: "video" },
    locationDetail: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true, index: true },
    position: { type: Number, default: 0 },
  },
  schemaOptions,
);
export const MeetingTypeModel = define("MeetingType", meetingTypeSchema);

/**
 * Rendez-vous réservé.
 *
 * L'index unique sur `(startAt, status)` ne suffirait pas à empêcher deux
 * réservations qui se chevauchent sans commencer à la même seconde : c'est la
 * vérification de conflit côté serveur, dans la même transaction logique, qui
 * fait le travail. L'index reste le dernier filet contre le double clic.
 */
const bookingSchema = new Schema<PlatformDoc>(
  {
    meetingTypeId: { type: Schema.Types.ObjectId, ref: "MeetingType", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true, default: "" },
    note: { type: String, default: "" },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    /** Fuseau annoncé par le réservant, pour lui réécrire à son heure. */
    timezone: { type: String, trim: true, default: "UTC" },
    locale: { type: String, enum: ["fr", "en"], default: "fr" },
    status: { type: String, enum: bookingStatuses, default: "confirmed", index: true },
    clientId: userRef,
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: "" },
    /** Rend la réservation idempotente sous un double envoi du formulaire. */
    submissionKey: { type: String, trim: true, default: "" },
  },
  schemaOptions,
);
bookingSchema.index({ startAt: 1, status: 1 });
bookingSchema.index(
  { submissionKey: 1 },
  { unique: true, partialFilterExpression: { submissionKey: { $type: "string", $gt: "" } } },
);
export const BookingModel = define("Booking", bookingSchema);
