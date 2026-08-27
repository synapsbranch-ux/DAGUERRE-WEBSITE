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
import { InvoiceModel } from "@/lib/db/models/platform";
import { isLocale } from "@/lib/i18n";
import { invoiceStatusLabels, labelOf, type InvoiceStatus } from "@/lib/platform/enums";
import { formatDate } from "@/lib/platform/format";
import { amountDue } from "@/lib/platform/invoices";
import { formatMoney } from "@/lib/platform/money";
import { requirePortal } from "@/lib/platform/portal";

type Doc = Record<string, unknown>;

/**
 * Factures du client connecté.
 *
 * L'appartenance vient de la session, jamais de l'URL : la requête filtre sur
 * l'identifiant du compte lu côté serveur. Les brouillons sont exclus — une
 * facture non émise n'existe pas encore pour le client, et la lui montrer
 * laisserait croire à une créance qui n'a pas été arrêtée.
 */
export default async function PortalInvoicesPage({
  params,
}: PageProps<"/[locale]/espace-client/factures">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);
  const t = dict.platform.invoices;

  const docs = (await InvoiceModel.find({
    clientId: portal.session.user.id,
    status: { $ne: "draft" },
  })
    .sort({ issuedAt: -1, createdAt: -1 })
    .limit(100)
    .lean()) as Doc[];

  return (
    <div className="grid gap-8">
      <PortalHeader eyebrow={dict.platform.portal.title} title={t.title} lead={t.lead} />

      {docs.length === 0 ? (
        <PortalEmpty title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.number}</TableHead>
                <TableHead className="hidden md:table-cell">{t.issued}</TableHead>
                <TableHead className="hidden md:table-cell">{t.due}</TableHead>
                <TableHead>{t.total}</TableHead>
                <TableHead>{t.balance}</TableHead>
                <TableHead>{dict.platform.common.status}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => {
                const currency = String(doc.currency ?? "CAD");
                const total = Number(doc.total ?? 0);
                const paid = Number(doc.amountPaid ?? 0);
                const status = String(doc.status ?? "sent") as InvoiceStatus;
                return (
                  <TableRow key={String(doc._id)}>
                    <TableCell className="font-medium">{String(doc.invoiceNumber ?? "")}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(doc.issuedAt, locale)}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(doc.dueAt, locale)}</TableCell>
                    <TableCell className="tabular-nums">{formatMoney(total, currency, locale)}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatMoney(amountDue(total, paid), currency, locale)}
                    </TableCell>
                    <TableCell>
                      <StatusPill label={labelOf(invoiceStatusLabels, status, locale)} />
                    </TableCell>
                    <TableCell>
                      {doc.documentFileId ? (
                        <Button asChild size="sm" variant="secondary">
                          <a href={`/api/files/${String(doc.documentFileId)}`} rel="nofollow">
                            {t.download}
                          </a>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
