import { notFound } from "next/navigation";

import { PortalNav } from "@/components/portal/PortalNav";
import { Container } from "@/components/ui/Container";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { portalNav, requirePortal } from "@/lib/platform/portal";

export const metadata = {
  // L'espace client n'a rien à indexer : son contenu dépend de la session.
  robots: { index: false, follow: false },
};

/**
 * Coquille de l'espace client.
 *
 * Elle vit **dans** le layout public : le client garde l'en-tête, le pied de
 * page et le sélecteur de langue du site. Un espace client qui coupe le
 * visiteur du reste du site l'oblige à revenir en arrière pour lire un
 * article, ce que la barre du portail permet justement d'éviter.
 *
 * La garde d'accès est ici, une seule fois, côté serveur.
 */
export default async function PortalLayout({ children, params }: LayoutProps<"/[locale]/espace-client">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);

  return (
    <Container>
      <div className="py-10 sm:py-14">
        <PortalNav items={portalNav(locale, dict, portal.counts)} label={dict.platform.portal.title} />

        {portal.session.user.emailVerified ? null : (
          <p
            role="status"
            className="mt-6 rounded-lg border border-border bg-[var(--plate)] px-4 py-3 text-sm text-muted-foreground"
          >
            {dict.platform.auth.unverified}
          </p>
        )}

        <div className="mt-8">{children}</div>
      </div>
    </Container>
  );
}
