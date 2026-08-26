import { notFound } from "next/navigation";

import { PortalHeader } from "@/components/portal/PortalPage";
import { QuoteRequestForm } from "@/components/quotes/QuoteRequestForm";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { requirePortal } from "@/lib/platform/portal";
import { listQuoteServices } from "@/lib/platform/queries";
import { href } from "@/lib/routes";

/**
 * Nouvelle demande depuis l'espace client.
 *
 * Même formulaire et même point d'entrée que la page publique : le dossier est
 * simplement rattaché au compte dès sa création, et les coordonnées viennent
 * du profil.
 */
export default async function PortalNewQuotePage({
  params,
}: PageProps<"/[locale]/espace-client/devis/nouveau">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);
  const services = await listQuoteServices(locale);

  return (
    <div className="grid gap-8">
      <PortalHeader
        eyebrow={dict.platform.portal.title}
        title={dict.platform.quotes.newRequest}
        lead={dict.platform.quotes.lead}
      />

      <QuoteRequestForm
        dict={dict}
        locale={locale}
        services={services}
        defaults={{
          email: portal.session.user.email,
          firstName: portal.profile.firstName || portal.session.user.name.split(" ")[0] || "",
          lastName: portal.profile.lastName,
          companyName: portal.profile.companyName,
          phone: portal.profile.phone,
        }}
        trackHrefBase={href("portalQuotes", locale)}
        registerHref={href("register", locale)}
        signedIn
      />
    </div>
  );
}
