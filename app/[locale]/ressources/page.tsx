import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ResourceLibrary } from "@/components/resources/ResourceLibrary";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { tryConnectToDatabase } from "@/lib/db/client";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { readPlatformSession } from "@/lib/platform/access";
import { listVisibleResources } from "@/lib/platform/queries";
import { href } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

const PAGE_SIZE = 12;

export async function generateMetadata({ params }: PageProps<"/[locale]/ressources">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionaryFor(locale);
  return createMetadata({
    locale,
    routeKey: "resources",
    title: dict.platform.resources.title,
    description: dict.platform.resources.lead,
    keywords: ["ressources", "rapports", "guides", "jeux de données"],
  });
}

/**
 * Bibliothèque publique.
 *
 * Un visiteur non connecté ne reçoit que les ressources publiques ; un compte
 * connecté voit en plus celles qui lui sont ouvertes. Le tri est fait par la
 * requête, pas par le composant : rien d'interdit n'atteint le navigateur.
 */
export default async function PublicResourcesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/ressources">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const query = await searchParams;
  const dict = await getDictionaryFor(locale);
  const basePath = href("resources", locale);

  const connected = await tryConnectToDatabase();
  const session = connected ? await readPlatformSession() : null;

  const read = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const page = Math.max(1, Number.parseInt(read("page") || "1", 10) || 1);

  const results = connected
    ? await listVisibleResources({
        locale,
        userId: session?.user.id ?? null,
        query: read("q"),
        categorySlug: read("categorie"),
        type: read("type"),
        page,
        limit: PAGE_SIZE,
      })
    : { items: [], total: 0, categories: [] };

  return (
    <Container>
      <PageHeader
        eyebrow={dict.platform.resources.title}
        title={dict.platform.resources.title}
        description={dict.platform.resources.lead}
      />
      <ResourceLibrary
        dict={dict}
        locale={locale}
        basePath={basePath}
        items={results.items}
        categories={results.categories}
        total={results.total}
        page={page}
        pageSize={PAGE_SIZE}
        query={read("q")}
        activeCategory={read("categorie")}
        activeType={read("type")}
        signedIn={Boolean(session)}
      />
    </Container>
  );
}
