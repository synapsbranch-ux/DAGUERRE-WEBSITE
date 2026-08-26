import { ServiceModel } from "@/lib/db/models";
import {
  ClientProjectModel,
  ClientProjectUpdateModel,
  ContentDownloadModel,
  ContentResourceModel,
  ConversationMessageModel,
  ConversationModel,
  NotificationModel,
  QuoteActivityModel,
  QuoteProposalModel,
  QuoteRequestModel,
  ResourceCategoryModel,
  StoredFileModel,
} from "@/lib/db/models/platform";
import { pickLocale, type LocalizedString } from "@/lib/db/models/shared";
import type { Locale } from "@/lib/i18n";
import { internalQuoteActivityTypes } from "@/lib/platform/enums";
import type { PlatformFilter } from "@/lib/platform/filters";

/**
 * Lectures de l'espace client.
 *
 * ## Règle unique et absolue
 *
 * L'appartenance est **dans la requête**, jamais vérifiée après coup sur un
 * document déjà chargé. `findById(id)` suivi d'un `if (doc.userId !== me)`
 * fonctionne jusqu'au jour où la condition manque dans une branche ; ici, un
 * identifiant qui n'est pas le vôtre ne remonte tout simplement rien, et
 * l'appelant rend un 404.
 *
 * ## Ce qui ne sort jamais d'ici
 *
 * - les notes internes (collection distincte, jamais interrogée) ;
 * - les activités marquées internes ;
 * - les propositions encore en brouillon ;
 * - les clés de stockage des fichiers.
 */

type Doc = Record<string, unknown>;

const str = (value: unknown): string => (typeof value === "string" ? value : value == null ? "" : String(value));
const iso = (value: unknown): string =>
  value instanceof Date ? value.toISOString() : typeof value === "string" && value ? value : "";
const id = (value: unknown): string => (value ? String(value) : "");

/* ------------------------------------------------------------------ */
/* Devis                                                               */
/* ------------------------------------------------------------------ */

export type QuoteSummary = {
  id: string;
  quoteNumber: string;
  title: string;
  serviceType: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
};

function toQuoteSummary(doc: Doc): QuoteSummary {
  return {
    id: id(doc._id),
    quoteNumber: str(doc.quoteNumber),
    title: str(doc.title),
    serviceType: str(doc.serviceType),
    status: str(doc.status),
    priority: str(doc.priority),
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  };
}

export async function listClientQuotes(
  userId: string,
  { page = 1, limit = 20 }: { page?: number; limit?: number } = {},
): Promise<{ items: QuoteSummary[]; total: number }> {
  const filter = { userId };
  const [docs, total] = await Promise.all([
    QuoteRequestModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    QuoteRequestModel.countDocuments(filter),
  ]);
  return { items: (docs as Doc[]).map(toQuoteSummary), total };
}

export type QuoteDetail = QuoteSummary & {
  description: string;
  businessObjective: string;
  dataSources: string;
  estimatedDataVolume: string;
  desiredDeliverables: string;
  budgetRange: string;
  desiredStartDate: string;
  deadline: string;
  companyName: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  locale: Locale;
  serviceId: string;
  projectId: string;
  userId: string;
};

function toQuoteDetail(doc: Doc): QuoteDetail {
  return {
    ...toQuoteSummary(doc),
    description: str(doc.description),
    businessObjective: str(doc.businessObjective),
    dataSources: str(doc.dataSources),
    estimatedDataVolume: str(doc.estimatedDataVolume),
    desiredDeliverables: str(doc.desiredDeliverables),
    budgetRange: str(doc.budgetRange),
    desiredStartDate: iso(doc.desiredStartDate),
    deadline: iso(doc.deadline),
    companyName: str(doc.companyName),
    email: str(doc.email),
    firstName: str(doc.firstName),
    lastName: str(doc.lastName),
    phone: str(doc.phone),
    locale: (str(doc.locale) === "en" ? "en" : "fr") as Locale,
    serviceId: id(doc.serviceId),
    projectId: id(doc.projectId),
    userId: str(doc.userId),
  };
}

export { toQuoteDetail, toQuoteSummary };

/** Demande appartenant à ce client, ou `null`. */
export async function findClientQuote(userId: string, quoteId: string): Promise<QuoteDetail | null> {
  const doc = (await QuoteRequestModel.findOne({ _id: quoteId, userId }).lean()) as Doc | null;
  return doc ? toQuoteDetail(doc) : null;
}

export type ActivityEntry = { id: string; type: string; createdAt: string; metadata: Doc };

/** Historique **visible du client** : les notes internes ne sont pas requêtées. */
export async function listQuoteActivity(quoteId: string, includeInternal = false): Promise<ActivityEntry[]> {
  const filter: PlatformFilter = includeInternal
    ? { quoteId }
    : { quoteId, type: { $nin: [...internalQuoteActivityTypes] } };

  const docs = (await QuoteActivityModel.find(filter).sort({ createdAt: 1 }).limit(200).lean()) as Doc[];
  return docs.map((doc) => ({
    id: id(doc._id),
    type: str(doc.type),
    createdAt: iso(doc.createdAt),
    metadata: (doc.metadata as Doc) ?? {},
  }));
}

export type ProposalItem = {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  position: number;
};

export type Proposal = {
  id: string;
  quoteRequestId: string;
  version: number;
  title: string;
  summary: string;
  currency: string;
  items: ProposalItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  validUntil: string;
  terms: string;
  status: string;
  sentAt: string;
  acceptedAt: string;
  declinedAt: string;
  declineReason: string;
  createdAt: string;
};

export function toProposal(doc: Doc): Proposal {
  const items = Array.isArray(doc.items) ? (doc.items as Doc[]) : [];
  return {
    id: id(doc._id),
    quoteRequestId: id(doc.quoteRequestId),
    version: Number(doc.version ?? 1),
    title: str(doc.title),
    summary: str(doc.summary),
    currency: str(doc.currency) || "CAD",
    items: items.map((item, index) => ({
      name: str(item.name),
      description: str(item.description),
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      amount: Number(item.amount ?? 0),
      position: Number(item.position ?? index),
    })),
    subtotal: Number(doc.subtotal ?? 0),
    discount: Number(doc.discount ?? 0),
    tax: Number(doc.tax ?? 0),
    total: Number(doc.total ?? 0),
    validUntil: iso(doc.validUntil),
    terms: str(doc.terms),
    status: str(doc.status),
    sentAt: iso(doc.sentAt),
    acceptedAt: iso(doc.acceptedAt),
    declinedAt: iso(doc.declinedAt),
    declineReason: str(doc.declineReason),
    createdAt: iso(doc.createdAt),
  };
}

/**
 * Propositions visibles du client.
 *
 * Un brouillon n'existe pas pour lui : il est en cours de rédaction, ses
 * montants peuvent encore changer, et le lui montrer reviendrait à négocier
 * par-dessus l'épaule de l'administrateur.
 */
export async function listClientProposals(quoteId: string): Promise<Proposal[]> {
  const docs = (await QuoteProposalModel.find({
    quoteRequestId: quoteId,
    status: { $ne: "draft" },
  })
    .sort({ version: -1 })
    .lean()) as Doc[];
  return docs.map(toProposal);
}

export async function listAdminProposals(quoteId: string): Promise<Proposal[]> {
  const docs = (await QuoteProposalModel.find({ quoteRequestId: quoteId })
    .sort({ version: -1 })
    .lean()) as Doc[];
  return docs.map(toProposal);
}

/* ------------------------------------------------------------------ */
/* Fichiers                                                            */
/* ------------------------------------------------------------------ */

export type FileSummary = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  label: string;
  createdAt: string;
};

function toFileSummary(doc: Doc): FileSummary {
  return {
    id: id(doc._id),
    filename: str(doc.originalFilename) || str(doc.filename),
    mimeType: str(doc.mimeType),
    size: Number(doc.size ?? 0),
    label: str(doc.label),
    createdAt: iso(doc.createdAt),
  };
}

export { toFileSummary };

/** Documents attachés à une demande — la clé GridFS ne quitte jamais le serveur. */
export async function listQuoteFiles(quoteId: string): Promise<FileSummary[]> {
  const docs = (await StoredFileModel.find({ quoteRequestId: quoteId })
    .sort({ createdAt: 1 })
    .lean()) as Doc[];
  return docs.map(toFileSummary);
}

export async function listProjectFiles(projectId: string): Promise<FileSummary[]> {
  const docs = (await StoredFileModel.find({ projectId }).sort({ createdAt: 1 }).lean()) as Doc[];
  return docs.map(toFileSummary);
}

/* ------------------------------------------------------------------ */
/* Conversations                                                       */
/* ------------------------------------------------------------------ */

export type ConversationSummary = {
  id: string;
  subject: string;
  context: string;
  status: string;
  quoteId: string;
  projectId: string;
  lastMessageAt: string;
  unreadForClient: number;
  unreadForAdmin: number;
  clientId: string;
};

export function toConversationSummary(doc: Doc): ConversationSummary {
  return {
    id: id(doc._id),
    subject: str(doc.subject),
    context: str(doc.context),
    status: str(doc.status),
    quoteId: id(doc.quoteId),
    projectId: id(doc.projectId),
    lastMessageAt: iso(doc.lastMessageAt),
    unreadForClient: Number(doc.unreadForClient ?? 0),
    unreadForAdmin: Number(doc.unreadForAdmin ?? 0),
    clientId: str(doc.clientId),
  };
}

export async function listClientConversations(userId: string, limit = 50): Promise<ConversationSummary[]> {
  const docs = (await ConversationModel.find({ clientId: userId })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .lean()) as Doc[];
  return docs.map(toConversationSummary);
}

export async function findClientConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationSummary | null> {
  const doc = (await ConversationModel.findOne({ _id: conversationId, clientId: userId }).lean()) as Doc | null;
  return doc ? toConversationSummary(doc) : null;
}

export type MessageEntry = {
  id: string;
  senderRole: string;
  senderName: string;
  body: string;
  createdAt: string;
  attachments: FileSummary[];
};

export async function listMessages(conversationId: string): Promise<MessageEntry[]> {
  const docs = (await ConversationMessageModel.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(500)
    .lean()) as Doc[];

  const attachmentIds = docs.flatMap((doc) =>
    Array.isArray(doc.attachments) ? (doc.attachments as unknown[]).map(id) : [],
  );

  const files = attachmentIds.length
    ? ((await StoredFileModel.find({ _id: { $in: attachmentIds } }).lean()) as Doc[])
    : [];
  const byId = new Map(files.map((file) => [id(file._id), toFileSummary(file)]));

  return docs.map((doc) => ({
    id: id(doc._id),
    senderRole: str(doc.senderRole),
    senderName: str(doc.senderName),
    body: str(doc.body),
    createdAt: iso(doc.createdAt),
    attachments: (Array.isArray(doc.attachments) ? (doc.attachments as unknown[]) : [])
      .map((value) => byId.get(id(value)))
      .filter((file): file is FileSummary => Boolean(file)),
  }));
}

/* ------------------------------------------------------------------ */
/* Projets                                                             */
/* ------------------------------------------------------------------ */

export type ProjectSummary = {
  id: string;
  projectNumber: string;
  title: string;
  description: string;
  status: string;
  startDate: string;
  targetDate: string;
  completedAt: string;
  quoteRequestId: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
};

export function toProjectSummary(doc: Doc): ProjectSummary {
  return {
    id: id(doc._id),
    projectNumber: str(doc.projectNumber),
    title: str(doc.title),
    description: str(doc.description),
    status: str(doc.status),
    startDate: iso(doc.startDate),
    targetDate: iso(doc.targetDate),
    completedAt: iso(doc.completedAt),
    quoteRequestId: id(doc.quoteRequestId),
    clientId: str(doc.clientId),
    createdAt: iso(doc.createdAt),
    updatedAt: iso(doc.updatedAt),
  };
}

export async function listClientProjects(userId: string): Promise<ProjectSummary[]> {
  const docs = (await ClientProjectModel.find({ clientId: userId })
    .sort({ createdAt: -1 })
    .lean()) as Doc[];
  return docs.map(toProjectSummary);
}

export async function findClientProject(userId: string, projectId: string): Promise<ProjectSummary | null> {
  const doc = (await ClientProjectModel.findOne({ _id: projectId, clientId: userId }).lean()) as Doc | null;
  return doc ? toProjectSummary(doc) : null;
}

export type ProjectUpdateEntry = { id: string; title: string; body: string; createdAt: string };

export async function listProjectUpdates(projectId: string): Promise<ProjectUpdateEntry[]> {
  const docs = (await ClientProjectUpdateModel.find({ projectId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()) as Doc[];
  return docs.map((doc) => ({
    id: id(doc._id),
    title: str(doc.title),
    body: str(doc.body),
    createdAt: iso(doc.createdAt),
  }));
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export type NotificationEntry = {
  id: string;
  type: string;
  title: string;
  message: string;
  href: string;
  readAt: string;
  createdAt: string;
};

export async function listNotifications(
  userId: string,
  { unreadOnly = false, limit = 50 }: { unreadOnly?: boolean; limit?: number } = {},
): Promise<NotificationEntry[]> {
  const filter: PlatformFilter = unreadOnly ? { userId, readAt: null } : { userId };
  const docs = (await NotificationModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean()) as Doc[];
  return docs.map((doc) => ({
    id: id(doc._id),
    type: str(doc.type),
    title: str(doc.title),
    message: str(doc.message),
    href: str(doc.href),
    readAt: iso(doc.readAt),
    createdAt: iso(doc.createdAt),
  }));
}

/* ------------------------------------------------------------------ */
/* Bibliothèque de ressources                                          */
/* ------------------------------------------------------------------ */

/**
 * Filtre de visibilité.
 *
 * C'est ici, et nulle part ailleurs, que se décide qui voit quelle ressource.
 * Un visiteur anonyme ne peut obtenir que `public` ; un compte connecté y
 * ajoute `authenticated` ; les ressources privées exigent d'être nommément
 * autorisé.
 */
export function resourceAccessFilter(userId: string | null): PlatformFilter {
  if (!userId) return { visibility: "public" };
  return {
    $or: [
      { visibility: { $in: ["public", "authenticated"] } },
      { visibility: "private", allowedUserIds: userId },
    ],
  };
}

export type ResourceSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  visibility: string;
  coverImage: string;
  categoryId: string;
  categoryName: string;
  publishedAt: string;
  downloadCount: number;
  hasFile: boolean;
  externalUrl: string;
};

export type ResourceDetail = ResourceSummary & { body: string; authorId: string };

function toResourceSummary(doc: Doc, locale: Locale, categoryNames: Map<string, string>): ResourceSummary {
  const categoryId = id(doc.categoryId);
  return {
    id: id(doc._id),
    slug: pickLocale(doc.slug as LocalizedString | undefined, locale) || pickLocale(doc.slug as LocalizedString, "fr"),
    title: pickLocale(doc.title as LocalizedString | undefined, locale),
    description: pickLocale(doc.description as LocalizedString | undefined, locale),
    type: str(doc.type),
    visibility: str(doc.visibility),
    coverImage: str(doc.coverImage),
    categoryId,
    categoryName: categoryNames.get(categoryId) ?? "",
    publishedAt: iso(doc.publishedAt),
    downloadCount: Number(doc.downloadCount ?? 0),
    hasFile: Boolean(doc.fileId),
    externalUrl: str(doc.externalUrl),
  };
}

export type ResourceCategoryEntry = { id: string; slug: string; name: string; order: number };

export async function listResourceCategories(locale: Locale): Promise<ResourceCategoryEntry[]> {
  const docs = (await ResourceCategoryModel.find().sort({ order: 1, slug: 1 }).lean()) as Doc[];
  return docs.map((doc) => ({
    id: id(doc._id),
    slug: str(doc.slug),
    name: pickLocale(doc.name as LocalizedString | undefined, locale),
    order: Number(doc.order ?? 0),
  }));
}

/**
 * Recherche dans la bibliothèque.
 *
 * La recherche et le filtrage se font **en base**, pas dans le navigateur :
 * charger toute la bibliothèque pour la filtrer côté client exposerait aussi
 * les fiches auxquelles le visiteur n'a pas droit.
 */
export async function listVisibleResources(options: {
  locale: Locale;
  userId: string | null;
  query?: string;
  categorySlug?: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: ResourceSummary[]; total: number; categories: ResourceCategoryEntry[] }> {
  const { locale, userId, query = "", categorySlug = "", type = "", page = 1, limit = 12 } = options;

  const categories = await listResourceCategories(locale);
  const categoryNames = new Map(categories.map((entry) => [entry.id, entry.name]));

  const conditions: PlatformFilter[] = [
    { status: "published", publishedAt: { $lte: new Date() } },
    resourceAccessFilter(userId),
  ];

  if (categorySlug) {
    const match = categories.find((entry) => entry.slug === categorySlug);
    conditions.push({ categoryId: match ? match.id : null });
  }
  if (type) conditions.push({ type });

  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    conditions.push({
      $or: [
        { "title.fr": regex },
        { "title.en": regex },
        { "description.fr": regex },
        { "description.en": regex },
      ],
    });
  }

  const filter: PlatformFilter = { $and: conditions };

  const [docs, total] = await Promise.all([
    ContentResourceModel.find(filter)
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ContentResourceModel.countDocuments(filter),
  ]);

  return {
    items: (docs as Doc[]).map((doc) => toResourceSummary(doc, locale, categoryNames)),
    total,
    categories,
  };
}

/** Fiche d'une ressource accessible à ce visiteur, ou `null`. */
export async function findVisibleResource(
  slug: string,
  locale: Locale,
  userId: string | null,
): Promise<ResourceDetail | null> {
  const filter: PlatformFilter = {
    $and: [
      { $or: [{ "slug.fr": slug }, { "slug.en": slug }] },
      { status: "published", publishedAt: { $lte: new Date() } },
      resourceAccessFilter(userId),
    ],
  };

  const doc = (await ContentResourceModel.findOne(filter).lean()) as Doc | null;
  if (!doc) return null;

  const categories = await listResourceCategories(locale);
  const summary = toResourceSummary(doc, locale, new Map(categories.map((c) => [c.id, c.name])));

  return {
    ...summary,
    body: pickLocale(doc.body as LocalizedString | undefined, locale),
    authorId: str(doc.authorId),
  };
}

export type DownloadEntry = { id: string; resourceId: string; title: string; slug: string; downloadedAt: string };

/** Derniers téléchargements du client, pour son tableau de bord. */
export async function listClientDownloads(
  userId: string,
  locale: Locale,
  limit = 5,
): Promise<DownloadEntry[]> {
  const docs = (await ContentDownloadModel.find({ userId })
    .sort({ downloadedAt: -1 })
    .limit(limit)
    .lean()) as Doc[];

  const resourceIds = docs.map((doc) => id(doc.resourceId));
  const resources = resourceIds.length
    ? ((await ContentResourceModel.find({ _id: { $in: resourceIds } })
        .select("title slug")
        .lean()) as Doc[])
    : [];
  const byId = new Map(resources.map((doc) => [id(doc._id), doc]));

  return docs.map((doc) => {
    const resource = byId.get(id(doc.resourceId));
    return {
      id: id(doc._id),
      resourceId: id(doc.resourceId),
      title: resource ? pickLocale(resource.title as LocalizedString | undefined, locale) : "",
      slug: resource ? pickLocale(resource.slug as LocalizedString | undefined, locale) : "",
      downloadedAt: iso(doc.downloadedAt),
    };
  });
}


/* ------------------------------------------------------------------ */
/* Services proposés au formulaire de devis                            */
/* ------------------------------------------------------------------ */

export type QuoteServiceOption = { id: string; label: string };

/**
 * Services publiés, sous forme de choix pour la demande de devis.
 *
 * La demande stocke une **relation** vers le service (`serviceId`) plutôt
 * qu'une chaîne recopiée : renommer une offre au CMS ne réécrit pas
 * l'historique des dossiers, et un devis reste rattaché à ce qui a été
 * demandé.
 */
export async function listQuoteServices(locale: Locale): Promise<QuoteServiceOption[]> {
  const docs = (await ServiceModel.find({ status: "published" })
    .select("title order")
    .sort({ order: 1 })
    .limit(60)
    .lean()) as Doc[];

  return docs
    .map((doc) => ({
      id: id(doc._id),
      label: pickLocale(doc.title as LocalizedString | undefined, locale),
    }))
    .filter((entry) => entry.label);
}
