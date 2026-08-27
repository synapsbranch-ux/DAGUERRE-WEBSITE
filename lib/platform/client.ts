import {
  ClientProfileModel,
  ConversationModel,
  NotificationModel,
  QuoteRequestModel,
} from "@/lib/db/models/platform";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { actionableQuoteStatuses } from "@/lib/platform/enums";

/**
 * Données transverses de l'espace client.
 *
 * Le profil est créé **paresseusement**, à la première visite plutôt qu'à
 * l'inscription. L'inscription se passe chez Logto : il n'y a plus de moment,
 * dans notre code, où l'attraper. Un crochet par webhook lierait de toute
 * façon la création de compte à la disponibilité de notre base, et ferait
 * échouer une inscription pour une raison sans rapport.
 */

export type ClientProfile = {
  userId: string;
  firstName: string;
  lastName: string;
  companyName: string;
  jobTitle: string;
  phone: string;
  country: string;
  preferredLanguage: Locale;
  industry: string;
  companySize: string;
  website: string;
};

type ProfileDoc = Partial<Record<keyof ClientProfile, unknown>>;

function toProfile(userId: string, doc: ProfileDoc | null): ClientProfile {
  const language = String(doc?.preferredLanguage ?? "");
  return {
    userId,
    firstName: String(doc?.firstName ?? ""),
    lastName: String(doc?.lastName ?? ""),
    companyName: String(doc?.companyName ?? ""),
    jobTitle: String(doc?.jobTitle ?? ""),
    phone: String(doc?.phone ?? ""),
    country: String(doc?.country ?? ""),
    preferredLanguage: isLocale(language) ? language : defaultLocale,
    industry: String(doc?.industry ?? ""),
    companySize: String(doc?.companySize ?? ""),
    website: String(doc?.website ?? ""),
  };
}

/**
 * Profil du client, créé s'il n'existe pas encore.
 *
 * `upsert` avec `$setOnInsert` est atomique : deux onglets ouverts en même
 * temps ne produisent pas deux fiches, et l'index unique sur `userId` refuse
 * de toute façon la seconde.
 *
 * `created` distingue la première visite des suivantes : c'est ce qui permet
 * d'envoyer le courriel de bienvenue **une seule fois**, sans dépendre d'une
 * notification de Logto qui pourrait se perdre ou arriver deux fois.
 */
export async function ensureClientProfile(
  userId: string,
  defaults: { name?: string; locale?: Locale } = {},
): Promise<{ profile: ClientProfile; created: boolean }> {
  const [firstName = "", ...rest] = (defaults.name ?? "").trim().split(/\s+/);

  const result = await ClientProfileModel.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        firstName,
        lastName: rest.join(" "),
        preferredLanguage: defaults.locale ?? defaultLocale,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, includeResultMetadata: true },
  ).lean();

  /*
   * `includeResultMetadata` renvoie le rapport brut du pilote, dont le type
   * générique n'expose pas `upserted` : la présence de ce champ dans
   * `lastErrorObject` est précisément ce qui distingue une insertion d'une
   * mise à jour.
   */
  const report = result as { value?: unknown; lastErrorObject?: { upserted?: unknown } } | null;
  const doc = (report?.value ?? null) as ProfileDoc | null;
  const created = Boolean(report?.lastErrorObject?.upserted);

  return { profile: toProfile(userId, doc), created };
}

export async function getClientProfile(userId: string): Promise<ClientProfile | null> {
  const doc = (await ClientProfileModel.findOne({ userId }).lean()) as ProfileDoc | null;
  return doc ? toProfile(userId, doc) : null;
}

/** Nom d'affichage : prénom du profil, à défaut le nom du compte. */
export function displayName(profile: ClientProfile | null, fallback: string): string {
  const full = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  return full || fallback;
}

export type PortalCounts = {
  activeQuotes: number;
  unreadMessages: number;
  unreadNotifications: number;
};

/**
 * Compteurs de la navigation.
 *
 * Seuls les éléments **actionnables** sont comptés : afficher « Devis (37) »
 * quand trente-cinq sont clos ne dit rien d'utile et transforme la navigation
 * en bruit.
 */
export async function getPortalCounts(userId: string): Promise<PortalCounts> {
  try {
    const [activeQuotes, unreadMessages, unreadNotifications] = await Promise.all([
      QuoteRequestModel.countDocuments({
        userId,
        status: { $nin: ["declined", "expired", "cancelled", "converted_to_project"] },
      }),
      ConversationModel.countDocuments({ clientId: userId, unreadForClient: { $gt: 0 } }),
      NotificationModel.countDocuments({ userId, readAt: null }),
    ]);
    return { activeQuotes, unreadMessages, unreadNotifications };
  } catch {
    return { activeQuotes: 0, unreadMessages: 0, unreadNotifications: 0 };
  }
}

export { actionableQuoteStatuses };
