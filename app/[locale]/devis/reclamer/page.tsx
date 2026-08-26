import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClaimQuote } from "@/components/quotes/ClaimQuote";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { readPlatformSession } from "@/lib/platform/access";
import { href } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/devis/reclamer">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionaryFor(locale);
  return createMetadata({
    locale,
    routeKey: "quoteClaim",
    title: dict.platform.quotes.successTrack,
    description: dict.platform.quotes.successLead,
    noIndex: true,
  });
}

/**
 * Réclamation d'une demande soumise sans compte.
 *
 * Un visiteur non connecté est d'abord invité à créer son compte, avec retour
 * sur cette page : le jeton reste dans l'URL, et le rattachement se fait
 * ensuite en un clic. C'est ce parcours qui évite de créer un second dossier
 * pour la même demande.
 */
export default async function ClaimQuotePage({
  params,
  searchParams,
}: PageProps<"/[locale]/devis/reclamer">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const query = await searchParams;
  const token = typeof query.jeton === "string" ? query.jeton : "";
  const dict = await getDictionaryFor(locale);
  const session = await readPlatformSession();

  const selfPath = `${href("quoteClaim", locale)}?jeton=${encodeURIComponent(token)}`;

  return (
    <Container>
      <PageHeader
        eyebrow={dict.platform.quotes.title}
        title={dict.platform.quotes.successTrack}
        description={token ? dict.platform.quotes.successLead : dict.platform.auth.resetInvalid}
      />

      {token ? (
        <div className="py-10">
          {session ? (
            <ClaimQuote dict={dict} token={token} trackHrefBase={href("portalQuotes", locale)} />
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`${href("register", locale)}?suivant=${encodeURIComponent(selfPath)}`}>
                  {dict.platform.auth.signUp}
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href={`${href("login", locale)}?suivant=${encodeURIComponent(selfPath)}`}>
                  {dict.platform.auth.signIn}
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </Container>
  );
}
