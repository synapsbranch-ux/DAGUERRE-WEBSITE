import { notFound } from "next/navigation";

import { ResourceDetail } from "@/components/resources/ResourceDetail";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { requirePortal } from "@/lib/platform/portal";
import { findVisibleResource } from "@/lib/platform/queries";
import { href } from "@/lib/routes";

export default async function PortalResourcePage({
  params,
}: PageProps<"/[locale]/espace-client/ressources/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);

  const resource = await findVisibleResource(slug, locale, portal.session.user.id);
  if (!resource) notFound();

  return (
    <ResourceDetail
      dict={dict}
      locale={locale}
      resource={resource}
      signedIn
      loginHref={href("login", locale)}
      backHref={href("portalResources", locale)}
    />
  );
}
