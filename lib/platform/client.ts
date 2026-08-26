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
 * l'inscription : brancher une écriture Mongoose dans le cycle de vie de
 * Better Auth lierait la création de compte à la disponibilité d'une seconde
 * connexion, et ferait échouer une inscription pour une raison sans rapport.
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
 */
export async function ensureClientProfile(
  userId: string,
  defaults: { name?: string; locale?: Locale } = {},
): Promise<ClientProfile> {
  const [firstName = "", ...rest] = (defaults.name ?? "").trim().split(/\s+/);

  const doc = (await ClientProfileModel.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        firstName,
        lastName: rest.join(" "),
        preferredLanguage: defaults.locale ?? defaultLocale,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean()) as ProfileDoc | null;

  return toProfile(userId, doc);
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
