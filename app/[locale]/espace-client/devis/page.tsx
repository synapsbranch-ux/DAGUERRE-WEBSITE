import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalEmpty, PortalHeader, StatusPill } from "@/components/portal/PortalPage";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { labelOf, quoteStatusLabels } from "@/lib/platform/enums";
import { formatDate } from "@/lib/platform/format";
import { requirePortal } from "@/lib/platform/portal";
import { listClientQuotes } from "@/lib/platform/queries";
import { href } from "@/lib/routes";

/** Suivi des demandes du client connecté. La requête porte l'appartenance. */
export default async function PortalQuotesPage({
  params,
}: PageProps<"/[locale]/espace-client/devis">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);
  const t = dict.platform.quotes;

  const quotes = await listClientQuotes(portal.session.user.id, { limit: 50 });
  const base = href("portalQuotes", locale);

  return (
    <div className="grid gap-8">
      <PortalHeader
        eyebrow={dict.platform.portal.title}
        title={t.myQuotes}
        lead={t.myQuotesLead}
        actions={
          <Button asChild size="sm">
            {/* Formulaire de l'espace : les coordonnées viennent du profil. */}
            <Link href={href("portalQuoteNew", locale)}>{t.newRequest}</Link>
          </Button>
        }
      />

      {quotes.items.length === 0 ? (
        <PortalEmpty
          title={t.emptyTitle}
          description={t.emptyBody}
          ctaLabel={t.emptyCta}
          ctaHref={href("portalQuoteNew", locale)}
        />
      ) : (
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.number}</TableHead>
                <TableHead>{t.project}</TableHead>
                <TableHead className="hidden md:table-cell">{t.submitted}</TableHead>
                <TableHead>{dict.platform.common.status}</TableHead>
                <TableHead className="hidden md:table-cell">{t.lastUpdate}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.items.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-mono text-xs">{quote.quoteNumber}</TableCell>
                  <TableCell>
                    <Link href={`${base}/${quote.id}`} className="font-medium hover:underline">
                      {quote.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(quote.createdAt, locale)}
                  </TableCell>
                  <TableCell>
                    <StatusPill label={labelOf(quoteStatusLabels, quote.status, locale)} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(quote.updatedAt, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
