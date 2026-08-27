import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDatabaseError, AdminPageHeader } from "@/components/admin/AdminTable";
import { InvoiceActions } from "@/components/admin/InvoiceActions";
import { InvoiceEditor } from "@/components/admin/InvoiceEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { InvoiceModel, InvoicePaymentModel } from "@/lib/db/models/platform";
import { validObjectId } from "@/lib/http";
import {
  invoiceStatusLabels,
  paymentMethodLabels,
  type InvoiceStatus,
  type PaymentMethod,
} from "@/lib/platform/enums";
import { amountDue } from "@/lib/platform/invoices";
import { formatMoney } from "@/lib/platform/money";
import { formatDate } from "@/lib/utils";

type Doc = Record<string, unknown>;

/** Fiche d'une facture : rédaction tant qu'elle est brouillon, suivi ensuite. */
export default async function AdminInvoicePage({ params }: PageProps<"/admin/factures/[id]">) {
  await requireAdmin();

  const { id } = await params;
  if (!validObjectId(id)) notFound();

  if (!(await tryConnectToDatabase())) return <AdminDatabaseError title="Facture" />;

  const doc = (await InvoiceModel.findById(id).lean()) as Doc | null;
  if (!doc) notFound();

  const payments = (await InvoicePaymentModel.find({ invoiceId: id })
    .sort({ receivedAt: -1 })
    .lean()) as Doc[];

  const status = String(doc.status ?? "draft") as InvoiceStatus;
  const currency = String(doc.currency ?? "CAD");
  const billTo = (doc.billTo ?? {}) as Doc;
  const total = Number(doc.total ?? 0);
  const paid = Number(doc.amountPaid ?? 0);
  const money = (minor: number) => formatMoney(minor, currency, "fr");

  const items = (Array.isArray(doc.items) ? (doc.items as Doc[]) : []).map((item) => ({
    name: String(item.name ?? ""),
    description: String(item.description ?? ""),
    quantity: String(item.quantity ?? 0),
    unitPrice: (Number(item.unitPrice ?? 0) / 100).toFixed(2),
  }));

  const taxes = (Array.isArray(doc.taxes) ? (doc.taxes as Doc[]) : []).map((tax) => ({
    label: String(tax.label ?? ""),
    ratePercent: String(Number(tax.ratePpm ?? 0) / 10_000),
    registration: String(tax.registration ?? ""),
  }));

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title={String(doc.invoiceNumber ?? "")}
        description={String(billTo.company || billTo.name || billTo.email || "")}
        actions={
          <>
            <Badge variant={status === "paid" ? "default" : status === "overdue" ? "destructive" : "outline"}>
              {invoiceStatusLabels[status]?.fr ?? status}
            </Badge>
            {doc.documentFileId ? (
              <Button asChild variant="secondary">
                <a href={`/api/files/${String(doc.documentFileId)}`} rel="nofollow">
                  Télécharger le PDF
                </a>
              </Button>
            ) : null}
            <Button asChild variant="secondary">
              <Link href="/admin/factures">Retour</Link>
            </Button>
          </>
        }
      />

      <dl className="mt-8 grid max-w-3xl gap-3 text-sm sm:grid-cols-3">
        <Entry label="Total" value={money(total)} />
        <Entry label="Réglé" value={money(paid)} />
        <Entry label="Solde" value={money(amountDue(total, paid))} />
        <Entry label="Émise le" value={formatDate(doc.issuedAt)} />
        <Entry label="Échéance" value={formatDate(doc.dueAt)} />
        <Entry label="Devise" value={currency} />
      </dl>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <InvoiceEditor
            initial={{
              id,
              clientId: String(doc.clientId ?? ""),
              billTo: {
                name: String(billTo.name ?? ""),
                email: String(billTo.email ?? ""),
                company: String(billTo.company ?? ""),
                address: String(billTo.address ?? ""),
              },
              currency,
              locale: String(doc.locale) === "en" ? "en" : "fr",
              items: items.length > 0 ? items : [{ name: "", description: "", quantity: "1", unitPrice: "0" }],
              discount: (Number(doc.discount ?? 0) / 100).toFixed(2),
              taxes,
              dueAt: doc.dueAt instanceof Date ? doc.dueAt.toISOString().slice(0, 10) : "",
              notes: String(doc.notes ?? ""),
              terms: String(doc.terms ?? ""),
              status,
            }}
          />

          {status !== "draft" ? (
            <section className="mt-10 grid gap-3 rounded-lg border border-border p-5">
              <h2 className="font-heading text-lg">Lignes facturées</h2>
              <ul className="divide-y divide-border text-sm">
                {(Array.isArray(doc.items) ? (doc.items as Doc[]) : []).map((item, index) => (
                  <li key={index} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2">
                    <span className="min-w-0 flex-1 font-medium">{String(item.name ?? "")}</span>
                    <span className="text-xs text-muted-foreground">×{String(item.quantity ?? "")}</span>
                    <span className="tabular-nums">{money(Number(item.amount ?? 0))}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="grid gap-8">
          <InvoiceActions invoiceId={id} status={status} canSend={Boolean(billTo.email)} />

          {payments.length > 0 ? (
            <section className="grid gap-3 rounded-lg border border-border p-5">
              <h2 className="font-heading text-lg">Paiements</h2>
              <ul className="divide-y divide-border text-sm">
                {payments.map((payment) => (
                  <li key={String(payment._id)} className="grid gap-0.5 py-2">
                    <div className="flex justify-between gap-3">
                      <span className="tabular-nums font-medium">{money(Number(payment.amount ?? 0))}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(payment.receivedAt)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {paymentMethodLabels[String(payment.method) as PaymentMethod]?.fr ?? String(payment.method)}
                      {payment.reference ? ` · ${String(payment.reference)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Entry({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value || "—"}</dd>
    </div>
  );
}
