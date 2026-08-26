import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuoteRequestForm } from "@/components/quotes/QuoteRequestForm";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { readPlatformSession } from "@/lib/platform/access";
import { tryConnectToDatabase } from "@/lib/db/client";
import { getClientProfile } from "@/lib/platform/client";
import { listQuoteServices } from "@/lib/platform/queries";
import { href } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/devis">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionaryFor(locale);
  return createMetadata({
    locale,
    routeKey: "quote",
    title: dict.platform.quotes.title,
    description: dict.platform.quotes.lead,
    keywords: ["devis", "estimation", "mandat", "analyse de données"],
  });
}

/**
 * Demande de devis — parcours public.
 *
 * Les services proposés viennent du CMS : ajouter une offre ne demande pas de
 * toucher au formulaire, et la demande porte une **relation** vers le service
 * plutôt qu'une chaîne libre recopiée.
 *
 * Un visiteur connecté retrouve ses coordonnées préremplies depuis son profil.
 */
export default async function QuotePage({ params }: PageProps<"/[locale]/devis">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, connected] = await Promise.all([getDictionaryFor(locale), tryConnectToDatabase()]);

  const services = connected ? await listQuoteServices(locale) : [];
  const session = connected ? await readPlatformSession() : null;
  const profile = session ? await getClientProfile(session.user.id) : null;

  return (
    <Container>
      <PageHeader
        eyebrow={dict.platform.quotes.title}
        title={dict.platform.quotes.title}
        description={dict.platform.quotes.lead}
      />
      <div className="py-12">
        <QuoteRequestForm
          dict={dict}
          locale={locale}
          services={services}
          defaults={
            session
              ? {
                  email: session.user.email,
                  firstName: profile?.firstName || session.user.name.split(" ")[0] || "",
                  lastName: profile?.lastName || session.user.name.split(" ").slice(1).join(" "),
                  companyName: profile?.companyName ?? "",
                  phone: profile?.phone ?? "",
                }
              : undefined
          }
          trackHrefBase={href("portalQuotes", locale)}
          registerHref={href("register", locale)}
          signedIn={Boolean(session)}
        />
      </div>
    </Container>
  );
}
