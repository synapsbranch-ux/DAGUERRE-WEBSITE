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
import { ContractModel } from "@/lib/db/models/platform";
import { isLocale } from "@/lib/i18n";
import { contractStatusLabels, labelOf, type ContractStatus } from "@/lib/platform/enums";
import { formatDate } from "@/lib/platform/format";
import { requirePortal } from "@/lib/platform/portal";

type Doc = Record<string, unknown>;

/**
 * Contrats du client connecté.
 *
 * L'espace client **ne sert pas à signer** : la signature passe par le lien
 * personnel envoyé à chaque partie, qui seul désigne un signataire. Un contrat
 * peut d'ailleurs concerner des parties qui n'ont pas de compte ici. Cette page
 * donne l'état d'avancement et, une fois le document scellé, sa copie.
 */
export default async function PortalContractsPage({
  params,
}: PageProps<"/[locale]/espace-client/contrats">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);
  const t = dict.platform.contracts;

  const docs = (await ContractModel.find({
    clientId: portal.session.user.id,
    status: { $ne: "draft" },
  })
    .sort({ sentAt: -1, createdAt: -1 })
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
                <TableHead>{t.document}</TableHead>
                <TableHead className="hidden md:table-cell">{t.sent}</TableHead>
                <TableHead className="hidden md:table-cell">{t.completed}</TableHead>
                <TableHead>{dict.platform.common.status}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => {
                const status = String(doc.status ?? "sent") as ContractStatus;
                return (
                  <TableRow key={String(doc._id)}>
                    <TableCell className="font-medium">{String(doc.contractNumber ?? "")}</TableCell>
                    <TableCell>{String(doc.title ?? "")}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(doc.sentAt, locale)}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(doc.completedAt, locale)}</TableCell>
                    <TableCell>
                      <StatusPill label={labelOf(contractStatusLabels, status, locale)} />
                    </TableCell>
                    <TableCell>
                      {doc.sealedFileId ? (
                        <Button asChild size="sm" variant="secondary">
                          <a href={`/api/files/${String(doc.sealedFileId)}`} rel="nofollow">
                            {t.download}
                          </a>
                        </Button>
                      ) : status === "sent" || status === "partially_signed" ? (
                        <span className="text-xs text-muted-foreground">{t.signPending}</span>
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
