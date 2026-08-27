import { redirect } from "next/navigation";

import { tryConnectToDatabase } from "@/lib/db/client";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { readPlatformSession, type PlatformSession } from "@/lib/platform/access";
import {
  ensureClientProfile,
  getPortalCounts,
  type ClientProfile,
  type PortalCounts,
} from "@/lib/platform/client";
import { currentPathname } from "@/lib/platform/request";
import { accountWelcomeEmail } from "@/lib/email/templates";
import { publicUrl, sendTransactionalEmail } from "@/lib/email/service";
import { href } from "@/lib/routes";

/**
 * Contexte de l'espace client, résolu une fois par requête.
 *
 * Chaque page de l'espace en a besoin : la session, le profil et les
 * compteurs. Les regrouper ici garantit surtout **une seule** implémentation
 * de la garde d'accès — un contrôle dupliqué finit toujours par diverger.
 */
export type PortalContext = {
  session: PlatformSession;
  profile: ClientProfile;
  counts: PortalCounts;
  locale: Locale;
};

/**
 * Garde de l'espace client.
 *
 * Un visiteur non connecté part vers la connexion avec le chemin qu'il
 * demandait, pour y revenir ensuite. La base injoignable est traitée comme un
 * refus : mieux vaut renvoyer vers la connexion que rendre une page vide qui
 * laisserait croire à un compte sans dossier.
 */
export async function requirePortal(locale: Locale): Promise<PortalContext> {
  const session = await readPlatformSession();
  const loginHref = href("login", locale);

  if (!session) {
    const requested = (await currentPathname()) ?? href("portal", locale);
    redirect(`${loginHref}?suivant=${encodeURIComponent(requested)}`);
  }

  if (!(await tryConnectToDatabase())) redirect(`${loginHref}?error=database`);

  const [{ profile, created }, counts] = await Promise.all([
    ensureClientProfile(session.user.id, { name: session.user.name, locale }),
    getPortalCounts(session.user.id),
  ]);

  /*
   * Bienvenue envoyée à la création de la fiche, donc exactement une fois.
   * L'attacher à l'inscription elle-même aurait lié la création d'un compte à
   * la disponibilité du fournisseur de courriel.
   */
  if (created) {
    await sendTransactionalEmail(
      session.user.email,
      accountWelcomeEmail(locale, {
        name: profile.firstName || session.user.name || session.user.email,
        portalUrl: publicUrl("portal", locale),
      }),
    ).catch(() => null);
  }

  return { session, profile, counts, locale };
}

export type PortalNavEntry = { key: string; label: string; href: string; count?: number };

/**
 * Entrées de navigation de l'espace client.
 *
 * Aucune rubrique n'est masquée : une section vide affiche un état vide avec
 * son appel à l'action, ce qui apprend au client ce qu'il peut faire. Cacher
 * « Projets » tant qu'il n'y en a aucun ferait apparaître une entrée nouvelle
 * sans prévenir, et déplacerait toutes les autres.
 */
export function portalNav(locale: Locale, dict: Dictionary, counts: PortalCounts): PortalNavEntry[] {
  const nav = dict.platform.portal.nav;
  return [
    { key: "overview", label: nav.overview, href: href("portal", locale) },
    { key: "quotes", label: nav.quotes, href: href("portalQuotes", locale), count: counts.activeQuotes },
    {
      key: "messages",
      label: nav.messages,
      href: href("portalMessages", locale),
      count: counts.unreadMessages,
    },
    { key: "projects", label: nav.projects, href: href("portalProjects", locale) },
    { key: "invoices", label: nav.invoices, href: href("portalInvoices", locale) },
    { key: "contracts", label: nav.contracts, href: href("portalContracts", locale) },
    { key: "resources", label: nav.resources, href: href("portalResources", locale) },
    { key: "articles", label: nav.articles, href: href("portalArticles", locale) },
    {
      key: "notifications",
      label: nav.notifications,
      href: href("portalNotifications", locale),
      count: counts.unreadNotifications,
    },
    { key: "profile", label: nav.profile, href: href("portalProfile", locale) },
  ];
}
