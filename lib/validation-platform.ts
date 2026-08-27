import { z } from "zod";

import { imageRef, absoluteUrl, localizedSchema, requiredLocalizedSchema, localizedSlugSchema, slugSchema } from "@/lib/validation";
import {
  campaignAudiences,
  clientProjectStatuses,
  conversationContexts,
  conversationStatuses,
  currencies,
  fileVisibilities,
  quotePriorities,
  quoteStatuses,
  paymentMethods,
  contractSources,
  signatureModes,
  resourceTypes,
  resourceVisibilities,
  subscriberSources,
  subscriberStatuses,
} from "@/lib/platform/enums";

/**
 * Schémas d'entrée de la plate-forme client.
 *
 * Même règle que pour le CMS éditorial : **rien** n'est écrit en base sans
 * être passé par un schéma, et un schéma décrit exactement les champs qu'un
 * formulaire expose. Deux conséquences volontaires :
 *
 * - le statut d'un devis, celui d'une campagne ou le total d'une proposition
 *   ne figurent dans aucun schéma de saisie : ils sont calculés ou décidés
 *   côté serveur, donc impossibles à imposer depuis le navigateur ;
 * - toute valeur d'énumération est validée contre la liste du serveur, jamais
 *   acceptée telle quelle.
 */

const text = (max = 10_000) => z.string().trim().max(max);

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), { message: "Courriel invalide." });

const optionalDate = z
  .string()
  .trim()
  .max(40)
  .refine((value) => value === "" || !Number.isNaN(Date.parse(value)), { message: "Date invalide." })
  .optional()
  .default("");

const objectId = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{24}$/, "Identifiant invalide.");

const optionalObjectId = z
  .string()
  .trim()
  .refine((value) => value === "" || /^[a-f0-9]{24}$/.test(value), "Identifiant invalide.")
  .optional()
  .default("");

const localeField = z.enum(["fr", "en"]).default("fr");

/**
 * Piège à pourriel.
 *
 * Le champ est **accepté** par le schéma, puis inspecté par le gestionnaire,
 * qui répond alors un succès factice. Le refuser ici renverrait une erreur de
 * validation : un robot saurait immédiatement qu'il a été repéré et
 * réessaierait sans remplir le champ.
 */
const honeypot = z.string().max(200).optional().default("");

/* ------------------------------------------------------------------ */
/* Infolettre                                                          */
/* ------------------------------------------------------------------ */

/**
 * Inscription publique.
 *
 * `consent` doit valoir `true` : un abonnement à une communication
 * commerciale ne se déduit jamais d'un autre geste. `source` est validée
 * contre la liste du serveur — un client ne choisit pas une provenance
 * arbitraire qui fausserait les statistiques.
 */
export const newsletterSubscribeSchema = z.object({
  email,
  firstName: text(80).optional().default(""),
  lastName: text(80).optional().default(""),
  consent: z.literal(true, { message: "Le consentement est obligatoire." }),
  source: z.enum([...subscriberSources]).default("homepage"),
  locale: localeField,
  website: honeypot,
});

/** Ajout manuel depuis le CMS — l'administrateur atteste du consentement. */
export const adminSubscriberCreateSchema = z.object({
  email,
  firstName: text(80).optional().default(""),
  lastName: text(80).optional().default(""),
  locale: localeField,
  status: z.enum(["pending", "active"]).default("active"),
});

export const subscriberStatusSchema = z.object({
  status: z.enum([...subscriberStatuses]),
});

/**
 * Campagne.
 *
 * `status`, `sentAt` et `recipientCount` sont absents : ils appartiennent au
 * moteur d'envoi. Un formulaire ne peut pas déclarer une campagne « envoyée ».
 */
export const campaignInputSchema = z.object({
  name: text(160).min(1, "Le nom est obligatoire."),
  subject: text(200).min(1, "L'objet est obligatoire."),
  previewText: text(200).optional().default(""),
  content: text(60_000).min(1, "Le corps est obligatoire."),
  locale: localeField,
  audienceType: z.enum([...campaignAudiences]).default("all_active"),
  scheduledAt: optionalDate,
});

export const campaignTestSchema = z.object({ email });

/** Confirmation d'envoi : la case doit être cochée, le nom recopié. */
export const campaignSendSchema = z.object({
  confirm: z.literal(true, { message: "La confirmation est obligatoire." }),
});

/* ------------------------------------------------------------------ */
/* Bibliothèque de ressources                                          */
/* ------------------------------------------------------------------ */

export const resourceCategoryInputSchema = z.object({
  slug: slugSchema,
  name: requiredLocalizedSchema,
  description: localizedSchema.optional().default({ fr: "", en: "" }),
  order: z.number().int().min(0).max(999).default(0),
});

export const contentResourceInputSchema = z
  .object({
    slug: localizedSlugSchema,
    title: requiredLocalizedSchema,
    description: localizedSchema.optional().default({ fr: "", en: "" }),
    body: localizedSchema.optional().default({ fr: "", en: "" }),
    type: z.enum([...resourceTypes]).default("pdf"),
    visibility: z.enum([...resourceVisibilities]).default("public"),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    coverImage: imageRef.optional().default(""),
    fileId: optionalObjectId,
    externalUrl: absoluteUrl.optional().default(""),
    categoryId: optionalObjectId,
    allowedUserIds: z.array(objectId).max(200).default([]),
    publishedAt: optionalDate,
  })
  .refine((value) => Boolean(value.fileId || value.externalUrl), {
    message: "Une ressource doit porter un fichier téléversé ou une URL externe.",
    path: ["fileId"],
  })
  .refine((value) => value.visibility !== "private" || value.allowedUserIds.length > 0, {
    message: "Une ressource privée doit désigner au moins un compte autorisé.",
    path: ["allowedUserIds"],
  });

/* ------------------------------------------------------------------ */
/* Devis                                                               */
/* ------------------------------------------------------------------ */

/**
 * Demande de devis.
 *
 * Seuls le contact, l'intitulé et la description sont obligatoires : exiger le
 * budget, les sources de données et l'échéance ferait abandonner la moitié des
 * demandes avant l'envoi. Le reste enrichit l'estimation quand il est fourni.
 */
export const quoteRequestInputSchema = z.object({
  firstName: text(80).min(1, "Le prénom est obligatoire."),
  lastName: text(80).min(1, "Le nom est obligatoire."),
  email,
  companyName: text(160).optional().default(""),
  phone: text(40).optional().default(""),
  serviceId: optionalObjectId,
  serviceType: text(80).optional().default("other"),
  title: text(200).min(3, "Donnez un intitulé à votre projet."),
  description: text(8000).min(20, "Décrivez le projet en quelques phrases."),
  businessObjective: text(4000).optional().default(""),
  dataSources: text(4000).optional().default(""),
  estimatedDataVolume: text(160).optional().default(""),
  desiredDeliverables: text(4000).optional().default(""),
  budgetRange: text(80).optional().default(""),
  desiredStartDate: optionalDate,
  deadline: optionalDate,
  locale: localeField,
  /** Consentement marketing distinct — décoché par défaut. */
  newsletterOptIn: z.boolean().default(false),
  /** Identifiant de soumission, pour l'idempotence. */
  submissionId: text(64).optional().default(""),
  website: honeypot,
});

export const quoteStatusUpdateSchema = z.object({
  status: z.enum([...quoteStatuses]),
  /** Message facultatif joint au client lors du changement d'état. */
  message: text(4000).optional().default(""),
});

export const quoteAssignSchema = z.object({
  priority: z.enum([...quotePriorities]).optional(),
  assignedToId: optionalObjectId,
});

export const quoteNoteInputSchema = z.object({
  body: text(8000).min(1, "La note est vide."),
});

/* ------------------------------------------------------------------ */
/* Propositions                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ligne de proposition.
 *
 * Les montants arrivent en chaîne (« 1250,50 ») et sont convertis en unités
 * mineures par `parseAmountToMinor`. Le montant de ligne n'est pas accepté en
 * entrée : il est recalculé, sinon rien n'empêcherait d'annoncer une ligne à
 * zéro sur une quantité facturée.
 */
export const proposalItemInputSchema = z.object({
  name: text(200).min(1, "Le libellé est obligatoire."),
  description: text(2000).optional().default(""),
  quantity: z.number().min(0).max(100_000),
  unitPrice: z.union([z.string(), z.number()]),
});

export const proposalInputSchema = z.object({
  title: text(200).min(1, "Le titre est obligatoire."),
  summary: text(4000).optional().default(""),
  currency: z.enum([...currencies]).default("CAD"),
  items: z.array(proposalItemInputSchema).min(1, "Ajoutez au moins une ligne.").max(60),
  discount: z.union([z.string(), z.number()]).optional().default("0"),
  tax: z.union([z.string(), z.number()]).optional().default("0"),
  validUntil: optionalDate,
  terms: text(8000).optional().default(""),
});

/**
 * Décision du client.
 *
 * `confirm` matérialise la case à cocher : accepter un devis engage
 * contractuellement, cela ne doit pas tenir à un clic isolé.
 */
export const proposalDecisionSchema = z.object({
  decision: z.enum(["accept", "decline"]),
  confirm: z.literal(true, { message: "Cochez la case de confirmation." }),
  reason: text(2000).optional().default(""),
});

/* ------------------------------------------------------------------ */
/* Conversations                                                       */
/* ------------------------------------------------------------------ */

export const conversationCreateSchema = z.object({
  subject: text(200).min(1, "Donnez un objet à votre message."),
  body: text(8000).min(1, "Le message est vide."),
  context: z.enum([...conversationContexts]).default("general"),
  quoteId: optionalObjectId,
  projectId: optionalObjectId,
});

export const messageInputSchema = z.object({
  body: text(8000).min(1, "Le message est vide."),
  /*
   * Identifiants de fichiers **déjà déposés**. Le serveur revérifie chacun :
   * un identifiant reçu ici ne rattache un fichier que s'il appartient bien à
   * l'expéditeur et à cette conversation. Le plafond évite qu'un message
   * traîne cent fichiers derrière lui.
   */
  attachmentFileIds: z.array(objectId).max(10).optional().default([]),
});

export const conversationStatusSchema = z.object({
  status: z.enum([...conversationStatuses]),
});

/* ------------------------------------------------------------------ */
/* Profil client                                                       */
/* ------------------------------------------------------------------ */

export const clientProfileInputSchema = z.object({
  firstName: text(80).optional().default(""),
  lastName: text(80).optional().default(""),
  companyName: text(160).optional().default(""),
  jobTitle: text(120).optional().default(""),
  phone: text(40).optional().default(""),
  country: text(80).optional().default(""),
  preferredLanguage: localeField,
  industry: text(120).optional().default(""),
  companySize: text(60).optional().default(""),
  website: absoluteUrl.optional().default(""),
});

/** Préférence marketing, distincte du compte lui-même. */
export const marketingPreferenceSchema = z.object({
  subscribed: z.boolean(),
});

/* ------------------------------------------------------------------ */
/* Projets clients                                                     */
/* ------------------------------------------------------------------ */

export const clientProjectInputSchema = z.object({
  title: text(200).min(1, "Le titre est obligatoire."),
  description: text(8000).optional().default(""),
  status: z.enum([...clientProjectStatuses]).default("planned"),
  startDate: optionalDate,
  targetDate: optionalDate,
  completedAt: optionalDate,
});

export const clientProjectUpdateInputSchema = z.object({
  title: text(200).min(1, "Le titre est obligatoire."),
  body: text(8000).optional().default(""),
});

/* ------------------------------------------------------------------ */
/* Fichiers                                                            */
/* ------------------------------------------------------------------ */

export const fileMetadataSchema = z.object({
  visibility: z.enum([...fileVisibilities]).default("admin_only"),
  ownerUserId: optionalObjectId,
  quoteRequestId: optionalObjectId,
  projectId: optionalObjectId,
  conversationId: optionalObjectId,
  label: text(200).optional().default(""),
});

/* ------------------------------------------------------------------ */
/* Facturation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Taux de taxe en parties par million.
 *
 * Saisi en pourcentage dans l'interface, converti avant d'arriver ici. Le
 * plafond à 1 000 000 interdit un taux supérieur à 100 % : au-delà, c'est une
 * faute de frappe, pas une intention.
 */
const ratePpm = z.coerce.number().int().min(0).max(1_000_000);

export const billingTaxSchema = z.object({
  label: text(60).min(1, "Le libellé de la taxe est obligatoire."),
  ratePpm,
  registration: text(60).optional().default(""),
});

export const billingSettingsSchema = z.object({
  legalName: text(160).optional().default(""),
  address: text(400).optional().default(""),
  email: z.union([email, z.literal("")]).optional().default(""),
  phone: text(40).optional().default(""),
  defaultCurrency: z.enum([...currencies]).default("CAD"),
  paymentTermsDays: z.coerce.number().int().min(0).max(365).default(30),
  taxes: z.array(billingTaxSchema).max(6).optional().default([]),
  defaultTerms: text(4000).optional().default(""),
  defaultNotes: text(4000).optional().default(""),
});

export const invoiceInputSchema = z.object({
  clientId: text(64).optional().default(""),
  billTo: z
    .object({
      name: text(160).optional().default(""),
      email: z.union([email, z.literal("")]).optional().default(""),
      company: text(160).optional().default(""),
      address: text(400).optional().default(""),
    })
    .optional()
    .default({ name: "", email: "", company: "", address: "" }),
  quoteRequestId: optionalObjectId,
  projectId: optionalObjectId,
  currency: z.enum([...currencies]).default("CAD"),
  locale: localeField,
  items: z.array(proposalItemInputSchema).min(1, "Ajoutez au moins une ligne.").max(60),
  discount: z.union([z.string(), z.number()]).optional().default("0"),
  taxes: z.array(billingTaxSchema).max(6).optional().default([]),
  dueAt: optionalDate,
  notes: text(4000).optional().default(""),
  terms: text(8000).optional().default(""),
});

export const paymentInputSchema = z.object({
  amount: z.union([z.string(), z.number()]),
  method: z.enum([...paymentMethods]).default("transfer"),
  reference: text(120).optional().default(""),
  receivedAt: optionalDate,
  note: text(1000).optional().default(""),
});

/* ------------------------------------------------------------------ */
/* Contrats et signature                                               */
/* ------------------------------------------------------------------ */

export const contractSignerInputSchema = z.object({
  name: text(160).min(1, "Le nom du signataire est obligatoire."),
  email,
  role: text(80).optional().default(""),
  /** 0 = sans ordre imposé ; sinon, rang d'apposition. */
  order: z.coerce.number().int().min(0).max(20).optional().default(0),
});

export const contractInputSchema = z.object({
  title: text(200).min(1, "Le titre est obligatoire."),
  source: z.enum([...contractSources]).default("generated"),
  body: text(120_000).optional().default(""),
  sourceFileId: optionalObjectId,
  clientId: text(64).optional().default(""),
  quoteRequestId: optionalObjectId,
  projectId: optionalObjectId,
  message: text(2000).optional().default(""),
  locale: localeField,
  expiresAt: optionalDate,
  signers: z.array(contractSignerInputSchema).min(1, "Ajoutez au moins un signataire.").max(10),
});

/**
 * Apposition d'une signature.
 *
 * `consent` matérialise la case à cocher. Elle n'est pas décorative : une
 * signature électronique simple tire sa valeur de l'intention manifestée, et
 * cocher une case explicite est la trace de cette intention.
 *
 * Le tracé est plafonné ici ; sa validité réelle — en-tête, dimensions, flux
 * compressé — est vérifiée par `checkSignaturePng`, parce qu'un PNG malformé
 * peut faire boucler le décodeur.
 */
export const signatureInputSchema = z.object({
  mode: z.enum([...signatureModes]).default("typed"),
  /** Nom saisi, ou image PNG encodée en base64. */
  value: z.string().max(200_000).min(1, "La signature est vide."),
  consent: z.literal(true, { message: "Vous devez confirmer votre intention de signer." }),
});

export const declineInputSchema = z.object({
  reason: text(1000).optional().default(""),
});

export { objectId as objectIdSchema, optionalObjectId as optionalObjectIdSchema, email as emailSchema };
