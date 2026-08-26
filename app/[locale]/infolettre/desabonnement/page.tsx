import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { tryConnectToDatabase } from "@/lib/db/client";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { TOKEN_PARAM, unsubscribeByToken } from "@/lib/platform/newsletter";
import { href } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/infolettre/desabonnement">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionaryFor(locale);
  return createMetadata({
    locale,
    routeKey: "newsletterUnsubscribe",
    title: dict.platform.newsletter.unsubscribeTitle,
    description: dict.platform.newsletter.unsubscribeBody,
    noIndex: true,
  });
}

/**
 * Désabonnement en un clic.
 *
 * Aucune connexion demandée, aucun formulaire à remplir : le lien contenu dans
 * l'infolettre suffit. Exiger une authentification pour se désabonner est le
 * meilleur moyen de récolter des signalements pour pourriel.
 */
export default async function NewsletterUnsubscribePage({
  params,
  searchParams,
}: PageProps<"/[locale]/infolettre/desabonnement">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const query = await searchParams;
  const token = typeof query[TOKEN_PARAM] === "string" ? (query[TOKEN_PARAM] as string) : null;
  const dict = await getDictionaryFor(locale);
  const t = dict.platform.newsletter;

  const connected = await tryConnectToDatabase();
  const outcome = connected
    ? await unsubscribeByToken(token)
    : ({ ok: false, reason: "invalid" } as const);

  const title = outcome.ok
    ? t.unsubscribeTitle
    : t.unsubscribeInvalid;
  const description = outcome.ok
    ? outcome.already
      ? t.unsubscribeAlready
      : t.unsubscribeBody
    : undefined;

  return (
    <Container>
      <PageHeader eyebrow={t.title} title={title} description={description} />
      <div className="py-10">
        <Link href={href("home", locale)} className="text-sm underline underline-offset-4">
          {dict.notFound.cta}
        </Link>
      </div>
    </Container>
  );
}
