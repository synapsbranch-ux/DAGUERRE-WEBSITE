import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { tryConnectToDatabase } from "@/lib/db/client";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { confirmSubscription, TOKEN_PARAM } from "@/lib/platform/newsletter";
import { href } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/infolettre/confirmation">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionaryFor(locale);
  return createMetadata({
    locale,
    routeKey: "newsletterConfirm",
    title: dict.platform.newsletter.confirmTitle,
    description: dict.platform.newsletter.confirmBody,
    noIndex: true,
  });
}

/**
 * Confirmation d'inscription (double opt-in).
 *
 * La confirmation s'effectue au rendu de la page, sur un jeton signé : rien
 * n'est activé tant que le lien reçu par courriel n'a pas été ouvert, ce qui
 * garantit que l'adresse appartient bien à la personne qui l'a saisie.
 */
export default async function NewsletterConfirmPage({
  params,
  searchParams,
}: PageProps<"/[locale]/infolettre/confirmation">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const query = await searchParams;
  const token = typeof query[TOKEN_PARAM] === "string" ? (query[TOKEN_PARAM] as string) : null;
  const dict = await getDictionaryFor(locale);
  const t = dict.platform.newsletter;

  const connected = await tryConnectToDatabase();
  const outcome = connected ? await confirmSubscription(token) : ({ ok: false, reason: "invalid" } as const);

  return (
    <Container>
      <PageHeader
        eyebrow={t.title}
        title={outcome.ok ? t.confirmTitle : t.confirmInvalid}
        description={outcome.ok ? t.confirmBody : undefined}
      />
      <div className="py-10">
        <Link href={href("blog", locale)} className="text-sm underline underline-offset-4">
          {dict.common.allArticles}
        </Link>
      </div>
    </Container>
  );
}
