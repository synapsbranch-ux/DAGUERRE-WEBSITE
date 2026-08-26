import { notFound } from "next/navigation";

import { PortalHeader } from "@/components/portal/PortalPage";
import { ResourceLibrary } from "@/components/resources/ResourceLibrary";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { requirePortal } from "@/lib/platform/portal";
import { listVisibleResources } from "@/lib/platform/queries";
import { href } from "@/lib/routes";

const PAGE_SIZE = 12;

/**
 * Bibliothèque de l'espace client.
 *
 * Même composant et même requête que la page publique : seul l'identifiant du
 * compte change, donc les ressources réservées apparaissent ici — et
 * uniquement pour les comptes qui y ont droit.
 */
export default async function PortalResourcesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/espace-client/ressources">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, portal, query] = await Promise.all([
    getDictionaryFor(locale),
    requirePortal(locale),
    searchParams,
  ]);

  const read = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const page = Math.max(1, Number.parseInt(read("page") || "1", 10) || 1);
  const basePath = href("portalResources", locale);

  const results = await listVisibleResources({
    locale,
    userId: portal.session.user.id,
    query: read("q"),
    categorySlug: read("categorie"),
    type: read("type"),
    page,
    limit: PAGE_SIZE,
  });

  return (
    <div className="grid gap-2">
      <PortalHeader
        eyebrow={dict.platform.portal.title}
        title={dict.platform.resources.title}
        lead={dict.platform.resources.portalLead}
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
        signedIn
      />
    </div>
  );
}
