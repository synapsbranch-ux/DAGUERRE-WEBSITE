import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { labelOf, proposalStatusLabels } from "@/lib/platform/enums";
import { formatDate } from "@/lib/platform/format";
import { formatMoney } from "@/lib/platform/money";
import type { Proposal } from "@/lib/platform/queries";

/**
 * Rendu d'une proposition.
 *
 * Les montants sont stockés en unités mineures entières et formatés ici dans
 * la devise de la proposition : `formatMoney` fait foi, aucun montant n'est
 * recomposé à la main dans le gabarit.
 *
 * Le même composant sert au client et à l'administration : le devis que
 * l'administrateur relit est, au pixel près, celui que le client a reçu.
 */
export function ProposalView({
  proposal,
  dict,
  locale,
}: {
  proposal: Proposal;
  dict: Dictionary;
  locale: Locale;
}) {
  const t = dict.platform.quotes;
  const money = (value: number) => formatMoney(value, proposal.currency, locale);

  return (
    <article className="rounded-lg border border-border">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={proposal.status === "accepted" ? "default" : "outline"}>
              {labelOf(proposalStatusLabels, proposal.status, locale)}
            </Badge>
            <span className="text-xs text-muted-foreground">v{proposal.version}</span>
          </div>
          <h3 className="mt-2 font-heading text-xl">{proposal.title}</h3>
          {proposal.summary ? (
            <p className="mt-2 max-w-[70ch] whitespace-pre-line text-sm text-muted-foreground">
              {proposal.summary}
            </p>
          ) : null}
        </div>

        <dl className="text-right text-sm">
          <dt className="text-muted-foreground">{t.total}</dt>
          <dd className="font-heading text-2xl">{money(proposal.total)}</dd>
          {proposal.validUntil ? (
            <>
              <dt className="mt-2 text-xs text-muted-foreground">{t.validUntil}</dt>
              <dd className="text-xs">{formatDate(proposal.validUntil, locale)}</dd>
            </>
          ) : null}
        </dl>
      </header>

      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.project}</TableHead>
              <TableHead className="text-right">{t.quantity}</TableHead>
              <TableHead className="text-right">{t.unitPrice}</TableHead>
              <TableHead className="text-right">{t.amount}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposal.items.map((item, index) => (
              <TableRow key={`${item.name}-${index}`}>
                <TableCell>
                  <span className="font-medium">{item.name}</span>
                  {item.description ? (
                    <span className="mt-1 block whitespace-pre-line text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">{money(item.unitPrice)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(item.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <dl className="grid gap-1.5 border-t border-border p-5 text-sm">
        <Line label={t.subtotal} value={money(proposal.subtotal)} />
        {proposal.discount > 0 ? <Line label={t.discount} value={`- ${money(proposal.discount)}`} /> : null}
        {proposal.tax > 0 ? <Line label={t.tax} value={money(proposal.tax)} /> : null}
        <Line label={t.total} value={money(proposal.total)} strong />
      </dl>

      {proposal.terms ? (
        <section className="border-t border-border p-5">
          <h4 className="font-heading text-sm uppercase tracking-wide text-muted-foreground">{t.terms}</h4>
          <p className="mt-2 whitespace-pre-line text-sm">{proposal.terms}</p>
        </section>
      ) : null}

      {proposal.acceptedAt || proposal.declinedAt ? (
        <footer className="border-t border-border p-5 text-sm text-muted-foreground">
          {proposal.acceptedAt
            ? `${t.acceptedOn} ${formatDate(proposal.acceptedAt, locale)}`
            : `${t.declinedOn} ${formatDate(proposal.declinedAt, locale)}`}
          {proposal.declineReason ? (
            <span className="mt-1 block whitespace-pre-line">{proposal.declineReason}</span>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 ${strong ? "border-t border-border pt-2 font-medium" : ""}`}>
      <dt className={strong ? "" : "text-muted-foreground"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
