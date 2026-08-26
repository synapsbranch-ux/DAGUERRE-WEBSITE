import { tryConnectToDatabase } from "@/lib/db/client";
import { ContactMessageModel } from "@/lib/db/models";
import {
  ClientProjectModel,
  ConversationModel,
  NewsletterSubscriberModel,
  QuoteRequestModel,
} from "@/lib/db/models/platform";
import { actionableQuoteStatuses } from "@/lib/platform/enums";

/**
 * Compteurs du tableau de bord.
 *
 * Ils comptent ce qui **réclame une action** : demandes à traiter,
 * conversations non lues, messages de contact nouveaux. Un compteur qui
 * affiche le total d'une collection reste allumé en permanence et cesse
 * d'être un signal.
 *
 * Une base injoignable renvoie des zéros plutôt qu'une erreur : le tableau de
 * bord doit rester consultable pour diagnostiquer la panne.
 */
export type AdminCounts = {
  quotes: number;
  conversations: number;
  contactMessages: number;
  activeProjects: number;
  subscribers: number;
};

export const EMPTY_COUNTS: AdminCounts = {
  quotes: 0,
  conversations: 0,
  contactMessages: 0,
  activeProjects: 0,
  subscribers: 0,
};

export async function getAdminCounts(): Promise<AdminCounts> {
  if (!(await tryConnectToDatabase())) return EMPTY_COUNTS;

  try {
    const [quotes, conversations, contactMessages, activeProjects, subscribers] = await Promise.all([
      QuoteRequestModel.countDocuments({ status: { $in: [...actionableQuoteStatuses] } }),
      ConversationModel.countDocuments({ unreadForAdmin: { $gt: 0 } }),
      ContactMessageModel.countDocuments({ status: "new" }),
      ClientProjectModel.countDocuments({ status: { $in: ["planned", "active"] } }),
      NewsletterSubscriberModel.countDocuments({ status: "active" }),
    ]);

    return { quotes, conversations, contactMessages, activeProjects, subscribers };
  } catch {
    return EMPTY_COUNTS;
  }
}

/** Compteurs indexés par chemin de section, pour les pastilles de navigation. */
export function navCounts(counts: AdminCounts): Record<string, number> {
  return {
    devis: counts.quotes,
    conversations: counts.conversations,
    messages: counts.contactMessages,
  };
}
