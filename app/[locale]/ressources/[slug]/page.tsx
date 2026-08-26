import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResourceDetail } from "@/components/resources/ResourceDetail";
import { Container } from "@/components/ui/Container";
import { tryConnectToDatabase } from "@/lib/db/client";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { readPlatformSession } from "@/lib/platform/access";
import { findVisibleResource } from "@/lib/platform/queries";
import { href } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/ressources/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  if (!(await tryConnectToDatabase())) return {};

  const session = await readPlatformSession();
  const resource = await findVisibleResource(slug, locale, session?.user.id ?? null);
  if (!resource) return {};

  return createMetadata({
    locale,
    routeKey: "resources",
    segments: { fr: [resource.slug], en: [resource.slug] },
    title: resource.title,
    description: resource.description,
    image: resource.coverImage || undefined,
    // Une ressource réservée n'a rien à faire dans un index public.
    noIndex: resource.visibility !== "public",
  });
}

export default async function PublicResourcePage({ params }: PageProps<"/[locale]/ressources/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, connected] = await Promise.all([getDictionaryFor(locale), tryConnectToDatabase()]);
  if (!connected) notFound();

  const session = await readPlatformSession();
  const resource = await findVisibleResource(slug, locale, session?.user.id ?? null);
  if (!resource) notFound();

  return (
    <Container>
      <ResourceDetail
        dict={dict}
        locale={locale}
        resource={resource}
        signedIn={Boolean(session)}
        loginHref={`${href("login", locale)}?suivant=${encodeURIComponent(href("resources", locale, slug))}`}
        backHref={href("resources", locale)}
      />
    </Container>
  );
}
