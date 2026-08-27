/**
 * Vocabulaire partagé de la plate-forme client.
 *
 * Chaque énumération vit ici **une seule fois** : le schéma Mongoose, le
 * schéma Zod, les libellés bilingues et les gardes de transition la lisent au
 * même endroit. Une valeur ajoutée à un tableau devient donc automatiquement
 * acceptée en base, validée en entrée et traduite à l'affichage — impossible
 * qu'un statut existe côté base sans libellé, ou l'inverse.
 */

import type { Locale } from "@/lib/i18n";

/** Libellé bilingue d'une valeur d'énumération. */
export type Labels<T extends string> = Record<T, Record<Locale, string>>;

/** Résout un libellé, avec repli sur la clé brute si la valeur est inconnue. */
export function labelOf<T extends string>(labels: Labels<T>, value: string, locale: Locale): string {
  return (labels as Record<string, Record<Locale, string>>)[value]?.[locale] ?? value;
}

export function isMember<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

/* ------------------------------------------------------------------ */
/* Rôles                                                               */
/* ------------------------------------------------------------------ */

/**
 * Rôles applicatifs — exactement deux, et ils sont **détenus par Logto**.
 *
 * L'application ne les écrit jamais dans sa propre base : elle lit la
 * revendication `roles` de l'ID token, signée par le fournisseur d'identité.
 * Le miroir `AppUser` en conserve une copie pour trier et rechercher dans le
 * tableau de bord, jamais pour décider d'un accès.
 */
export const roles = ["admin", "customer"] as const;
export type Role = (typeof roles)[number];

export const roleLabels: Labels<Role> = {
  admin: { fr: "Administrateur", en: "Administrator" },
  customer: { fr: "Client", en: "Customer" },
};

/**
 * Un compte sans rôle reconnu est un client.
 *
 * Normalisation fermée : une valeur inattendue — rôle Logto renommé, portée
 * `roles` oubliée dans la configuration, charge utile tronquée — dégrade les
 * droits au lieu de les élargir. Elle n'ouvre jamais le tableau de bord.
 */
export function normalizeRole(value: unknown): Role {
  return isMember(roles, value) ? value : "customer";
}

export function isAdminRole(value: unknown): boolean {
  return normalizeRole(value) === "admin";
}

/* ------------------------------------------------------------------ */
/* Infolettre                                                          */
/* ------------------------------------------------------------------ */

export const subscriberStatuses = ["pending", "active", "unsubscribed", "bounced", "complained"] as const;
export type SubscriberStatus = (typeof subscriberStatuses)[number];

export const subscriberStatusLabels: Labels<SubscriberStatus> = {
  pending: { fr: "En attente", en: "Pending" },
  active: { fr: "Actif", en: "Active" },
  unsubscribed: { fr: "Désabonné", en: "Unsubscribed" },
  bounced: { fr: "Rejeté", en: "Bounced" },
  complained: { fr: "Plainte", en: "Complained" },
};

/**
 * Seuls ces états reçoivent une campagne. Un rejet dur ou une plainte
 * interdisent définitivement l'envoi : réessayer abîme la réputation du
 * domaine expéditeur.
 */
export const mailableSubscriberStatuses: readonly SubscriberStatus[] = ["active"];

export const subscriberSources = [
  "homepage",
  "blog",
  "article",
  "footer",
  "client_portal",
  "content_download",
  "quote",
  "admin",
] as const;
export type SubscriberSource = (typeof subscriberSources)[number];

export const subscriberSourceLabels: Labels<SubscriberSource> = {
  homepage: { fr: "Accueil", en: "Homepage" },
  blog: { fr: "Blogue", en: "Blog" },
  article: { fr: "Article", en: "Article" },
  footer: { fr: "Pied de page", en: "Footer" },
  client_portal: { fr: "Espace client", en: "Client portal" },
  content_download: { fr: "Téléchargement", en: "Download" },
  quote: { fr: "Demande de devis", en: "Quote request" },
  admin: { fr: "Saisie manuelle", en: "Manual entry" },
};

export const campaignStatuses = [
  "draft",
  "ready",
  /** Départ programmé : le planificateur la lancera à `scheduledAt`. */
  "scheduled",
  "sending",
  "sent",
  "cancelled",
  "failed",
] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

export const campaignStatusLabels: Labels<CampaignStatus> = {
  draft: { fr: "Brouillon", en: "Draft" },
  ready: { fr: "Prête", en: "Ready" },
  scheduled: { fr: "Programmée", en: "Scheduled" },
  sending: { fr: "Envoi en cours", en: "Sending" },
  sent: { fr: "Envoyée", en: "Sent" },
  cancelled: { fr: "Annulée", en: "Cancelled" },
  failed: { fr: "Échec", en: "Failed" },
};

export const campaignAudiences = ["all_active", "locale_fr", "locale_en", "clients", "non_clients"] as const;
export type CampaignAudience = (typeof campaignAudiences)[number];

export const campaignAudienceLabels: Labels<CampaignAudience> = {
  all_active: { fr: "Tous les abonnés actifs", en: "All active subscribers" },
  locale_fr: { fr: "Abonnés francophones", en: "French-speaking subscribers" },
  locale_en: { fr: "Abonnés anglophones", en: "English-speaking subscribers" },
  clients: { fr: "Abonnés titulaires d'un compte", en: "Subscribers with an account" },
  non_clients: { fr: "Abonnés sans compte", en: "Subscribers without an account" },
};

export const recipientStatuses = [
  "queued",
  "sent",
  "delivered",
  "failed",
  "bounced",
  "complained",
  "skipped",
] as const;
export type RecipientStatus = (typeof recipientStatuses)[number];

export const recipientStatusLabels: Labels<RecipientStatus> = {
  queued: { fr: "En file", en: "Queued" },
  sent: { fr: "Envoyé", en: "Sent" },
  delivered: { fr: "Distribué", en: "Delivered" },
  failed: { fr: "Échec", en: "Failed" },
  bounced: { fr: "Rejeté", en: "Bounced" },
  complained: { fr: "Plainte", en: "Complained" },
  skipped: { fr: "Ignoré", en: "Skipped" },
};

/* ------------------------------------------------------------------ */
/* Bibliothèque de ressources                                          */
/* ------------------------------------------------------------------ */

export const resourceTypes = [
  "pdf",
  "report",
  "guide",
  "template",
  "dataset",
  "whitepaper",
  "presentation",
  "spreadsheet",
  "other",
] as const;
export type ResourceType = (typeof resourceTypes)[number];

export const resourceTypeLabels: Labels<ResourceType> = {
  pdf: { fr: "PDF", en: "PDF" },
  report: { fr: "Rapport", en: "Report" },
  guide: { fr: "Guide", en: "Guide" },
  template: { fr: "Gabarit", en: "Template" },
  dataset: { fr: "Jeu de données", en: "Dataset" },
  whitepaper: { fr: "Livre blanc", en: "Whitepaper" },
  presentation: { fr: "Présentation", en: "Presentation" },
  spreadsheet: { fr: "Feuille de calcul", en: "Spreadsheet" },
  other: { fr: "Autre", en: "Other" },
};

/**
 * Portée d'une ressource.
 *
 * - `public` : visible et téléchargeable sans compte ;
 * - `authenticated` : réservée aux comptes connectés ;
 * - `private` : réservée aux comptes explicitement autorisés.
 */
export const resourceVisibilities = ["public", "authenticated", "private"] as const;
export type ResourceVisibility = (typeof resourceVisibilities)[number];

export const resourceVisibilityLabels: Labels<ResourceVisibility> = {
  public: { fr: "Public", en: "Public" },
  authenticated: { fr: "Comptes connectés", en: "Signed-in accounts" },
  private: { fr: "Clients autorisés", en: "Authorised clients" },
};

/* ------------------------------------------------------------------ */
/* Fichiers privés                                                     */
/* ------------------------------------------------------------------ */

export const fileVisibilities = [
  "public",
  "client_account",
  "specific_client",
  "specific_project",
  "admin_only",
] as const;
export type FileVisibility = (typeof fileVisibilities)[number];

export const fileVisibilityLabels: Labels<FileVisibility> = {
  public: { fr: "Public", en: "Public" },
  client_account: { fr: "Tout compte client", en: "Any client account" },
  specific_client: { fr: "Un client précis", en: "A specific client" },
  specific_project: { fr: "Un projet précis", en: "A specific project" },
  admin_only: { fr: "Administration", en: "Administrators only" },
};

/* ------------------------------------------------------------------ */
/* Devis                                                               */
/* ------------------------------------------------------------------ */

export const quoteStatuses = [
  "submitted",
  "under_review",
  "needs_information",
  "estimate_prepared",
  "quote_sent",
  "client_review",
  "accepted",
  "declined",
  "expired",
  "cancelled",
  "converted_to_project",
] as const;
export type QuoteStatus = (typeof quoteStatuses)[number];

export const quoteStatusLabels: Labels<QuoteStatus> = {
  submitted: { fr: "Soumise", en: "Submitted" },
  under_review: { fr: "À l'étude", en: "Under review" },
  needs_information: { fr: "Information requise", en: "Information required" },
  estimate_prepared: { fr: "Estimation préparée", en: "Estimate prepared" },
  quote_sent: { fr: "Devis transmis", en: "Quote sent" },
  client_review: { fr: "En revue chez le client", en: "Client review" },
  accepted: { fr: "Acceptée", en: "Accepted" },
  declined: { fr: "Refusée", en: "Declined" },
  expired: { fr: "Expirée", en: "Expired" },
  cancelled: { fr: "Annulée", en: "Cancelled" },
  converted_to_project: { fr: "Convertie en projet", en: "Converted to project" },
};

/**
 * Machine à états d'une demande de devis.
 *
 * Une transition absente de cette table est refusée côté serveur : sans elle,
 * une requête forgée pourrait faire passer une demande de « soumise » à
 * « convertie en projet » sans qu'aucun devis n'ait jamais été envoyé.
 *
 * Les états terminaux (`declined`, `expired`, `cancelled`,
 * `converted_to_project`) n'ont volontairement aucune sortie : l'historique
 * d'une affaire close ne se réécrit pas.
 */
export const quoteTransitions: Record<QuoteStatus, readonly QuoteStatus[]> = {
  submitted: ["under_review", "needs_information", "cancelled"],
  under_review: ["needs_information", "estimate_prepared", "declined", "cancelled"],
  needs_information: ["under_review", "estimate_prepared", "cancelled"],
  estimate_prepared: ["quote_sent", "under_review", "cancelled"],
  quote_sent: ["client_review", "accepted", "declined", "expired", "cancelled"],
  client_review: ["accepted", "declined", "expired", "needs_information", "cancelled"],
  accepted: ["converted_to_project", "cancelled"],
  declined: [],
  expired: [],
  cancelled: [],
  converted_to_project: [],
};

export function canTransitionQuote(from: string, to: string): boolean {
  if (!isMember(quoteStatuses, from) || !isMember(quoteStatuses, to)) return false;
  return quoteTransitions[from].includes(to);
}

/** Demandes qui réclament une action de l'administration. */
export const actionableQuoteStatuses: readonly QuoteStatus[] = [
  "submitted",
  "under_review",
  "needs_information",
];

export const quotePriorities = ["low", "normal", "high", "urgent"] as const;
export type QuotePriority = (typeof quotePriorities)[number];

export const quotePriorityLabels: Labels<QuotePriority> = {
  low: { fr: "Basse", en: "Low" },
  normal: { fr: "Normale", en: "Normal" },
  high: { fr: "Haute", en: "High" },
  urgent: { fr: "Urgente", en: "Urgent" },
};

export const quoteActivityTypes = [
  "created",
  "status_changed",
  "message_sent",
  "file_uploaded",
  "quote_sent",
  "quote_updated",
  "client_accepted",
  "client_declined",
  "admin_note_added",
  "information_requested",
  "converted_to_project",
] as const;
export type QuoteActivityType = (typeof quoteActivityTypes)[number];

export const quoteActivityLabels: Labels<QuoteActivityType> = {
  created: { fr: "Demande soumise", en: "Request submitted" },
  status_changed: { fr: "Statut modifié", en: "Status changed" },
  message_sent: { fr: "Message échangé", en: "Message exchanged" },
  file_uploaded: { fr: "Document déposé", en: "Document uploaded" },
  quote_sent: { fr: "Devis transmis", en: "Quote sent" },
  quote_updated: { fr: "Devis mis à jour", en: "Quote updated" },
  client_accepted: { fr: "Devis accepté", en: "Quote accepted" },
  client_declined: { fr: "Devis refusé", en: "Quote declined" },
  admin_note_added: { fr: "Note interne", en: "Internal note" },
  information_requested: { fr: "Information demandée", en: "Information requested" },
  converted_to_project: { fr: "Projet ouvert", en: "Project opened" },
};

/**
 * Activités **jamais** exposées au client.
 *
 * Le filtre est appliqué à la requête, pas au rendu : une note interne ne doit
 * pas transiter jusqu'au navigateur du client, même masquée en CSS.
 */
export const internalQuoteActivityTypes: readonly QuoteActivityType[] = ["admin_note_added"];

/* ------------------------------------------------------------------ */
/* Propositions                                                        */
/* ------------------------------------------------------------------ */

export const proposalStatuses = ["draft", "sent", "accepted", "declined", "expired", "superseded"] as const;
export type ProposalStatus = (typeof proposalStatuses)[number];

export const proposalStatusLabels: Labels<ProposalStatus> = {
  draft: { fr: "Brouillon", en: "Draft" },
  sent: { fr: "Transmise", en: "Sent" },
  accepted: { fr: "Acceptée", en: "Accepted" },
  declined: { fr: "Refusée", en: "Declined" },
  expired: { fr: "Expirée", en: "Expired" },
  superseded: { fr: "Remplacée", en: "Superseded" },
};

/** Une proposition transmise ou acceptée n'est plus modifiable. */
export const editableProposalStatuses: readonly ProposalStatus[] = ["draft"];

/**
 * Devises acceptées.
 *
 * `HTG` et `CAD` couvrent les deux ancrages de la pratique ; `USD` et `EUR`
 * les mandats internationaux. Une proposition porte **une** devise : mélanger
 * les monnaies dans un même total n'a aucun sens comptable.
 */
export const currencies = ["CAD", "USD", "EUR", "HTG"] as const;
export type Currency = (typeof currencies)[number];

/* ------------------------------------------------------------------ */
/* Conversations                                                       */
/* ------------------------------------------------------------------ */

export const conversationContexts = ["general", "quote", "project"] as const;
export type ConversationContext = (typeof conversationContexts)[number];

export const conversationContextLabels: Labels<ConversationContext> = {
  general: { fr: "Général", en: "General" },
  quote: { fr: "Devis", en: "Quote" },
  project: { fr: "Projet", en: "Project" },
};

export const conversationStatuses = ["open", "closed", "archived"] as const;
export type ConversationStatus = (typeof conversationStatuses)[number];

export const conversationStatusLabels: Labels<ConversationStatus> = {
  open: { fr: "Ouverte", en: "Open" },
  closed: { fr: "Fermée", en: "Closed" },
  archived: { fr: "Archivée", en: "Archived" },
};

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export const notificationTypes = [
  "quote_updated",
  "new_message",
  "new_proposal",
  "project_update",
  "resource_available",
  "information_requested",
  "invoice_issued",
  "contract_to_sign",
  "meeting_booked",
] as const;
export type NotificationType = (typeof notificationTypes)[number];

export const notificationTypeLabels: Labels<NotificationType> = {
  quote_updated: { fr: "Devis mis à jour", en: "Quote updated" },
  new_message: { fr: "Nouveau message", en: "New message" },
  new_proposal: { fr: "Nouvelle proposition", en: "New proposal" },
  project_update: { fr: "Projet mis à jour", en: "Project update" },
  resource_available: { fr: "Nouvelle ressource", en: "New resource" },
  information_requested: { fr: "Information demandée", en: "Information requested" },
  invoice_issued: { fr: "Nouvelle facture", en: "New invoice" },
  contract_to_sign: { fr: "Contrat à signer", en: "Contract to sign" },
  meeting_booked: { fr: "Rendez-vous confirmé", en: "Meeting confirmed" },
};

/* ------------------------------------------------------------------ */
/* Projets clients                                                     */
/* ------------------------------------------------------------------ */

export const clientProjectStatuses = ["planned", "active", "on_hold", "completed", "cancelled"] as const;
export type ClientProjectStatus = (typeof clientProjectStatuses)[number];

export const clientProjectStatusLabels: Labels<ClientProjectStatus> = {
  planned: { fr: "Planifié", en: "Planned" },
  active: { fr: "En cours", en: "Active" },
  on_hold: { fr: "En pause", en: "On hold" },
  completed: { fr: "Terminé", en: "Completed" },
  cancelled: { fr: "Annulé", en: "Cancelled" },
};

/* ------------------------------------------------------------------ */
/* Journal d'administration                                            */
/* ------------------------------------------------------------------ */

export const auditActions = [
  "quote_status_changed",
  "quote_assigned",
  "quote_note_added",
  "proposal_created",
  "proposal_updated",
  "proposal_sent",
  "resource_published",
  "resource_unpublished",
  "resource_deleted",
  "newsletter_sent",
  "newsletter_test_sent",
  "subscriber_status_changed",
  "subscriber_deleted",
  "subscriber_created",
  "client_document_uploaded",
  "client_document_deleted",
  "project_created",
  "project_updated",
  "conversation_status_changed",
  "message_sent",
  "user_role_changed",
  "invoice_created",
  "invoice_sent",
  "invoice_cancelled",
  "payment_recorded",
  "contract_created",
  "contract_sent",
  "contract_signed",
  "contract_cancelled",
  "booking_created",
  "booking_cancelled",
] as const;
export type AuditAction = (typeof auditActions)[number];

export const auditActionLabels: Labels<AuditAction> = {
  quote_status_changed: { fr: "Statut de devis modifié", en: "Quote status changed" },
  quote_assigned: { fr: "Devis assigné", en: "Quote assigned" },
  quote_note_added: { fr: "Note interne ajoutée", en: "Internal note added" },
  proposal_created: { fr: "Proposition créée", en: "Proposal created" },
  proposal_updated: { fr: "Proposition modifiée", en: "Proposal updated" },
  proposal_sent: { fr: "Proposition transmise", en: "Proposal sent" },
  resource_published: { fr: "Ressource publiée", en: "Resource published" },
  resource_unpublished: { fr: "Ressource dépubliée", en: "Resource unpublished" },
  resource_deleted: { fr: "Ressource supprimée", en: "Resource deleted" },
  newsletter_sent: { fr: "Infolettre envoyée", en: "Newsletter sent" },
  newsletter_test_sent: { fr: "Test d'infolettre envoyé", en: "Newsletter test sent" },
  subscriber_status_changed: { fr: "Statut d'abonné modifié", en: "Subscriber status changed" },
  subscriber_deleted: { fr: "Abonné supprimé", en: "Subscriber deleted" },
  subscriber_created: { fr: "Abonné ajouté", en: "Subscriber added" },
  client_document_uploaded: { fr: "Document client déposé", en: "Client document uploaded" },
  client_document_deleted: { fr: "Document client supprimé", en: "Client document deleted" },
  project_created: { fr: "Projet créé", en: "Project created" },
  project_updated: { fr: "Projet modifié", en: "Project updated" },
  conversation_status_changed: { fr: "Conversation modifiée", en: "Conversation updated" },
  message_sent: { fr: "Message envoyé", en: "Message sent" },
  user_role_changed: { fr: "Rôle modifié", en: "Role changed" },
  invoice_created: { fr: "Facture créée", en: "Invoice created" },
  invoice_sent: { fr: "Facture envoyée", en: "Invoice sent" },
  invoice_cancelled: { fr: "Facture annulée", en: "Invoice cancelled" },
  payment_recorded: { fr: "Paiement enregistré", en: "Payment recorded" },
  contract_created: { fr: "Contrat créé", en: "Contract created" },
  contract_sent: { fr: "Contrat transmis", en: "Contract sent" },
  contract_signed: { fr: "Contrat signé", en: "Contract signed" },
  contract_cancelled: { fr: "Contrat annulé", en: "Contract cancelled" },
  booking_created: { fr: "Rendez-vous réservé", en: "Meeting booked" },
  booking_cancelled: { fr: "Rendez-vous annulé", en: "Meeting cancelled" },
};

/* ------------------------------------------------------------------ */
/* Factures                                                            */
/* ------------------------------------------------------------------ */

/**
 * Cycle de vie d'une facture.
 *
 * `cancelled` existe parce qu'une facture émise ne se **supprime** pas : la
 * numérotation comptable doit rester continue et sans trou. On l'annule, la
 * trace demeure, et le numéro n'est jamais réattribué.
 */
export const invoiceStatuses = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const invoiceStatusLabels: Labels<InvoiceStatus> = {
  draft: { fr: "Brouillon", en: "Draft" },
  sent: { fr: "Envoyée", en: "Sent" },
  partially_paid: { fr: "Partiellement payée", en: "Partially paid" },
  paid: { fr: "Payée", en: "Paid" },
  overdue: { fr: "En retard", en: "Overdue" },
  cancelled: { fr: "Annulée", en: "Cancelled" },
};

/**
 * Transitions autorisées. Un brouillon se modifie et se supprime ; tout le
 * reste ne fait qu'avancer. `paid` et `cancelled` sont terminaux.
 */
export const invoiceTransitions: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["partially_paid", "paid", "overdue", "cancelled"],
  partially_paid: ["paid", "overdue", "cancelled"],
  overdue: ["partially_paid", "paid", "cancelled"],
  paid: [],
  cancelled: [],
};

export const paymentMethods = ["transfer", "cheque", "cash", "card", "other"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const paymentMethodLabels: Labels<PaymentMethod> = {
  transfer: { fr: "Virement", en: "Transfer" },
  cheque: { fr: "Chèque", en: "Cheque" },
  cash: { fr: "Comptant", en: "Cash" },
  card: { fr: "Carte", en: "Card" },
  other: { fr: "Autre", en: "Other" },
};

/* ------------------------------------------------------------------ */
/* Contrats et signature électronique                                  */
/* ------------------------------------------------------------------ */

/** Un contrat est rédigé dans l'application, ou déposé tel quel. */
export const contractSources = ["generated", "uploaded"] as const;
export type ContractSource = (typeof contractSources)[number];

export const contractSourceLabels: Labels<ContractSource> = {
  generated: { fr: "Rédigé ici", en: "Written here" },
  uploaded: { fr: "PDF déposé", en: "Uploaded PDF" },
};

export const contractStatuses = [
  "draft",
  "sent",
  "partially_signed",
  "signed",
  "declined",
  "expired",
  "cancelled",
] as const;
export type ContractStatus = (typeof contractStatuses)[number];

export const contractStatusLabels: Labels<ContractStatus> = {
  draft: { fr: "Brouillon", en: "Draft" },
  sent: { fr: "En attente de signature", en: "Awaiting signature" },
  partially_signed: { fr: "Partiellement signé", en: "Partially signed" },
  signed: { fr: "Signé", en: "Signed" },
  declined: { fr: "Refusé", en: "Declined" },
  expired: { fr: "Expiré", en: "Expired" },
  cancelled: { fr: "Annulé", en: "Cancelled" },
};

/**
 * Un contrat signé est **immuable**. Le sceller puis le rouvrir viderait la
 * signature de son sens : ce que les parties ont approuvé ne peut plus changer.
 */
export const contractTransitions: Record<ContractStatus, readonly ContractStatus[]> = {
  draft: ["sent", "cancelled"],
  sent: ["partially_signed", "signed", "declined", "expired", "cancelled"],
  partially_signed: ["signed", "declined", "expired", "cancelled"],
  signed: [],
  declined: [],
  expired: [],
  cancelled: [],
};

export const signerStatuses = ["pending", "viewed", "signed", "declined"] as const;
export type SignerStatus = (typeof signerStatuses)[number];

export const signerStatusLabels: Labels<SignerStatus> = {
  pending: { fr: "En attente", en: "Pending" },
  viewed: { fr: "Consulté", en: "Viewed" },
  signed: { fr: "Signé", en: "Signed" },
  declined: { fr: "Refusé", en: "Declined" },
};

/** Comment la signature a été apposée — porté dans la piste d'audit. */
export const signatureModes = ["typed", "drawn"] as const;
export type SignatureMode = (typeof signatureModes)[number];

export const signatureModeLabels: Labels<SignatureMode> = {
  typed: { fr: "Saisie au clavier", en: "Typed" },
  drawn: { fr: "Tracée", en: "Drawn" },
};

/* ------------------------------------------------------------------ */
/* Agenda et rendez-vous                                               */
/* ------------------------------------------------------------------ */

export const eventKinds = ["meeting", "task", "reminder", "blocked"] as const;
export type EventKind = (typeof eventKinds)[number];

export const eventKindLabels: Labels<EventKind> = {
  meeting: { fr: "Rendez-vous", en: "Meeting" },
  task: { fr: "Tâche", en: "Task" },
  reminder: { fr: "Rappel", en: "Reminder" },
  /** Plage rendue indisponible à la réservation, sans être un rendez-vous. */
  blocked: { fr: "Indisponible", en: "Blocked" },
};

export const bookingStatuses = ["confirmed", "cancelled", "completed", "no_show"] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const bookingStatusLabels: Labels<BookingStatus> = {
  confirmed: { fr: "Confirmé", en: "Confirmed" },
  cancelled: { fr: "Annulé", en: "Cancelled" },
  completed: { fr: "Honoré", en: "Completed" },
  no_show: { fr: "Absence", en: "No-show" },
};

/** Où se tient la rencontre. */
export const meetingLocations = ["video", "phone", "in_person"] as const;
export type MeetingLocation = (typeof meetingLocations)[number];

export const meetingLocationLabels: Labels<MeetingLocation> = {
  video: { fr: "Visioconférence", en: "Video call" },
  phone: { fr: "Téléphone", en: "Phone" },
  in_person: { fr: "En personne", en: "In person" },
};
