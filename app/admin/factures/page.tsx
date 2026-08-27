import Link from "next/link";

import {
  AdminDatabaseError,
  AdminFilters,
  AdminPageHeader,
  AdminPagination,
  AdminSelect,
  AdminTable,
  type AdminColumn,
} from "@/components/admin/AdminTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { InvoiceModel } from "@/lib/db/models/platform";
import { buildListHref, readPage, readParam } from "@/lib/platform/admin-filters";
import { invoiceStatusLabels, invoiceStatuses, type InvoiceStatus } from "@/lib/platform/enums";
import { amountDue } from "@/lib/platform/invoices";
import { formatMoney } from "@/lib/platform/money";
import { formatDate } from "@/lib/utils";

const BASE = "/admin/factures";
const PAGE_SIZE = 25;

type Row = {
  id: string;
  number: string;
  client: string;
  status: InvoiceStatus;
  total: string;
  due: string;
  dueDate: string;
};

/** Un solde à payer se lit d'un coup d'œil ; le total seul ne dit pas l'urgence. */
export default async function AdminInvoicesPage({ searchParams }: PageProps<"/admin/factures">) {
  await requireAdmin();

  if (!(await tryConnectToDatabase())) return <AdminDatabaseError title="Factures" />;

  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const page = readPage(params);
  const status = readParam(params, "statut");
  // Le filtre est reconstruit ici plutôt que repris du paramètre : une valeur
  // inconnue ne doit pas atteindre la requête.
  const search = readParam(params, "q");

  const filter: Record<string, unknown> = {};
  if ((invoiceStatuses as readonly string[]).includes(status)) filter.status = status;
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    filter.$or = [
      { invoiceNumber: regex },
      { "billTo.name": regex },
      { "billTo.company": regex },
      { "billTo.email": regex },
    ];
  }

  const [docs, total] = await Promise.all([
    InvoiceModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    InvoiceModel.countDocuments(filter),
  ]);

  const rows: Row[] = (docs as Record<string, unknown>[]).map((doc) => {
    const billTo = (doc.billTo ?? {}) as Record<string, unknown>;
    const currency = String(doc.currency ?? "CAD");
    return {
      id: String(doc._id),
      number: String(doc.invoiceNumber ?? ""),
      client: String(billTo.company || billTo.name || billTo.email || "—"),
      status: String(doc.status ?? "draft") as InvoiceStatus,
      total: formatMoney(Number(doc.total ?? 0), currency, "fr"),
      due: formatMoney(amountDue(Number(doc.total ?? 0), Number(doc.amountPaid ?? 0)), currency, "fr"),
      dueDate: formatDate(doc.dueAt),
    };
  });

  const columns: AdminColumn<Row>[] = [
    {
      key: "number",
      header: "Numéro",
      cell: (row) => (
        <Link href={`${BASE}/${row.id}`} className="font-medium hover:underline">
          {row.number}
        </Link>
      ),
    },
    { key: "client", header: "Client", cell: (row) => row.client },
    {
      key: "status",
      header: "Statut",
      cell: (row) => (
        <Badge variant={row.status === "paid" ? "default" : row.status === "overdue" ? "destructive" : "outline"}>
          {invoiceStatusLabels[row.status]?.fr ?? row.status}
        </Badge>
      ),
    },
    { key: "total", header: "Total", cell: (row) => row.total, secondary: true },
    { key: "due", header: "Solde", cell: (row) => row.due },
    { key: "dueDate", header: "Échéance", cell: (row) => row.dueDate, secondary: true },
  ];

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title="Factures"
        description="Une facture émise ne se modifie plus : elle s'annule et se réémet."
        actions={
          <Button asChild>
            <Link href={`${BASE}/new`}>Nouvelle facture</Link>
          </Button>
        }
      />

      <AdminFilters action={BASE} query={search} searchLabel="Rechercher" placeholder="Numéro, client…">
        <AdminSelect
          name="statut"
          label="Statut"
          value={status}
          options={[
            { value: "", label: "Tous" },
            ...invoiceStatuses.map((value) => ({ value, label: invoiceStatusLabels[value].fr })),
          ]}
        />
      </AdminFilters>

      <AdminTable
        columns={columns}
        rows={rows}
        empty={{
          title: "Aucune facture",
          description: "Créez-en une depuis un devis accepté ou de zéro.",
          ctaLabel: "Nouvelle facture",
          ctaHref: `${BASE}/new`,
        }}
      />

      <AdminPagination
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        buildHref={(next) => buildListHref(BASE, params, next)}
      />
    </>
  );
}
