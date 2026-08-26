import { type PlatformFilter } from "@/lib/platform/filters";
import {
  campaignStatuses,
  clientProjectStatuses,
  conversationStatuses,
  isMember,
  quotePriorities,
  quoteStatuses,
  resourceTypes,
  resourceVisibilities,
  subscriberSources,
  subscriberStatuses,
} from "@/lib/platform/enums";

/**
 * Filtres des listes du tableau de bord.
 *
 * Les paramètres d'URL sont des données non fiables : chaque valeur d'énumération
 * est vérifiée contre la liste du serveur avant d'entrer dans une requête, et
 * les termes de recherche sont échappés avant d'être transformés en expression
 * régulière. Sans cet échappement, un terme comme `.*` ferait remonter tout le
 * jeu de données, et une expression pathologique bloquerait le serveur.
 */

/** Expression régulière insensible à la casse, à partir d'un terme littéral. */
export function searchRegex(term: string): { $regex: string; $options: string } {
  return { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
}

export function readParam(params: URLSearchParams, key: string, max = 120): string {
  return (params.get(key) ?? "").trim().slice(0, max);
}

/** Numéro de page, borné : `?page=-5` ou `?page=abc` valent 1. */
export function readPage(params: URLSearchParams): number {
  const value = Number.parseInt(params.get("page") ?? "1", 10);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 10_000) : 1;
}

/** Reconstruit une URL de liste en conservant les filtres actifs. */
export function buildListHref(base: string, params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  const query = next.toString();
  return query ? `${base}?${query}` : base;
}

/* ------------------------------------------------------------------ */
/* Abonnés                                                             */
/* ------------------------------------------------------------------ */

export function subscriberFilter(params: URLSearchParams): PlatformFilter {
  const conditions: PlatformFilter[] = [];

  const query = readParam(params, "q");
  if (query) {
    const regex = searchRegex(query);
    conditions.push({ $or: [{ email: regex }, { firstName: regex }, { lastName: regex }] });
  }

  const status = readParam(params, "status", 30);
  if (isMember(subscriberStatuses, status)) conditions.push({ status });

  const source = readParam(params, "source", 30);
  if (isMember(subscriberSources, source)) conditions.push({ source });

  const locale = readParam(params, "locale", 5);
  if (locale === "fr" || locale === "en") conditions.push({ locale });

  return conditions.length ? { $and: conditions } : {};
}

/* ------------------------------------------------------------------ */
/* Campagnes                                                           */
/* ------------------------------------------------------------------ */

export function campaignFilter(params: URLSearchParams): PlatformFilter {
  const conditions: PlatformFilter[] = [];

  const query = readParam(params, "q");
  if (query) {
    const regex = searchRegex(query);
    conditions.push({ $or: [{ name: regex }, { subject: regex }] });
  }

  const status = readParam(params, "status", 30);
  if (isMember(campaignStatuses, status)) conditions.push({ status });

  return conditions.length ? { $and: conditions } : {};
}

/* ------------------------------------------------------------------ */
/* Devis                                                               */
/* ------------------------------------------------------------------ */

export function quoteFilter(params: URLSearchParams): PlatformFilter {
  const conditions: PlatformFilter[] = [];

  const query = readParam(params, "q");
  if (query) {
    const regex = searchRegex(query);
    conditions.push({
      $or: [
        { quoteNumber: regex },
        { title: regex },
        { email: regex },
        { firstName: regex },
        { lastName: regex },
        { companyName: regex },
      ],
    });
  }

  const status = readParam(params, "status", 40);
  if (isMember(quoteStatuses, status)) conditions.push({ status });

  const priority = readParam(params, "priority", 20);
  if (isMember(quotePriorities, priority)) conditions.push({ priority });

  const service = readParam(params, "service", 40);
  if (/^[a-f0-9]{24}$/.test(service)) conditions.push({ serviceId: service });

  const assigned = readParam(params, "assigned", 40);
  if (/^[a-f0-9]{24}$/.test(assigned)) conditions.push({ assignedToId: assigned });

  return conditions.length ? { $and: conditions } : {};
}

/* ------------------------------------------------------------------ */
/* Ressources                                                          */
/* ------------------------------------------------------------------ */

export function resourceFilter(params: URLSearchParams): PlatformFilter {
  const conditions: PlatformFilter[] = [];

  const query = readParam(params, "q");
  if (query) {
    const regex = searchRegex(query);
    conditions.push({
      $or: [
        { "title.fr": regex },
        { "title.en": regex },
        { "description.fr": regex },
        { "description.en": regex },
      ],
    });
  }

  const status = readParam(params, "status", 20);
  if (status === "draft" || status === "published" || status === "archived") conditions.push({ status });

  const visibility = readParam(params, "visibility", 30);
  if (isMember(resourceVisibilities, visibility)) conditions.push({ visibility });

  const type = readParam(params, "type", 30);
  if (isMember(resourceTypes, type)) conditions.push({ type });

  const category = readParam(params, "category", 40);
  if (/^[a-f0-9]{24}$/.test(category)) conditions.push({ categoryId: category });

  return conditions.length ? { $and: conditions } : {};
}

/* ------------------------------------------------------------------ */
/* Projets et conversations                                            */
/* ------------------------------------------------------------------ */

export function clientProjectFilter(params: URLSearchParams): PlatformFilter {
  const conditions: PlatformFilter[] = [];

  const query = readParam(params, "q");
  if (query) {
    const regex = searchRegex(query);
    conditions.push({ $or: [{ projectNumber: regex }, { title: regex }] });
  }

  const status = readParam(params, "status", 30);
  if (isMember(clientProjectStatuses, status)) conditions.push({ status });

  return conditions.length ? { $and: conditions } : {};
}

export function conversationFilter(params: URLSearchParams): PlatformFilter {
  const conditions: PlatformFilter[] = [];

  const query = readParam(params, "q");
  if (query) conditions.push({ subject: searchRegex(query) });

  const status = readParam(params, "status", 20);
  if (isMember(conversationStatuses, status)) conditions.push({ status });

  if (readParam(params, "unread", 5) === "1") conditions.push({ unreadForAdmin: { $gt: 0 } });

  return conditions.length ? { $and: conditions } : {};
}
