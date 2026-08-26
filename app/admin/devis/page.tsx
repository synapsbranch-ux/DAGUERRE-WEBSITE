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
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { QuoteRequestModel } from "@/lib/db/models/platform";
import { buildListHref, quoteFilter, readPage, readParam } from "@/lib/platform/admin-filters";
import {
  actionableQuoteStatuses,
  quotePriorities,
  quotePriorityLabels,
  quoteStatusLabels,
  quoteStatuses,
} from "@/lib/platform/enums";
import { formatDate } from "@/lib/utils";

const BASE = "/admin/devis";
const PAGE_SIZE = 25;

type Row = {
  id: string;
  quoteNumber: string;
  client: string;
  company: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
};

const tone: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  submitted: "default",
  under_review: "secondary",
  needs_information: "secondary",
  accepted: "default",
  declined: "outline",
  expired: "outline",
  cancelled: "outline",
};

/**
 * File des demandes de devis.
 *
 * Recherche, filtres, tri et pagination sont faits en base : la file d'un
 * cabinet actif dépasse vite ce qu'on peut charger d'un coup, et un filtrage
 * côté navigateur enverrait chaque dossier au client pour n'en afficher que
 * quelques-uns.
 */
export default async function AdminQuotesPage({ searchParams }: PageProps<"/admin/devis">) {
  await requireAdmin();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Devis" />;

  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const page = readPage(params);
  const filter = quoteFilter(params);

  const [docs, total, actionable] = await Promise.all([
    QuoteRequestModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    QuoteRequestModel.countDocuments(filter),
    QuoteRequestModel.countDocuments({ status: { $in: [...actionableQuoteStatuses] } }),
  ]);

  const rows: Row[] = (docs as Record<string, unknown>[]).map((doc) => ({
    id: String(doc._id),
    quoteNumber: String(doc.quoteNumber ?? ""),
    client: `${String(doc.firstName ?? "")} ${String(doc.lastName ?? "")}`.trim(),
    company: String(doc.companyName ?? ""),
    title: String(doc.title ?? ""),
    status: String(doc.status ?? ""),
    priority: String(doc.priority ?? "normal"),
    createdAt: formatDate(doc.createdAt),
    updatedAt: formatDate(doc.updatedAt),
  }));

  const columns: AdminColumn<Row>[] = [
    {
      key: "quoteNumber",
      header: "Devis",
      cell: (row) => (
        <Link href={`${BASE}/${row.id}`} className="font-mono text-xs hover:underline">
          {row.quoteNumber}
        </Link>
      ),
    },
    {
      key: "title",
      header: "Projet",
      cell: (row) => (
        <Link href={`${BASE}/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </Link>
      ),
    },
    { key: "client", header: "Client", cell: (row) => row.client || "—" },
    { key: "company", header: "Organisation", cell: (row) => row.company || "—", secondary: true },
    {
      key: "status",
      header: "Statut",
      cell: (row) => (
        <Badge variant={tone[row.status] ?? "outline"}>
          {quoteStatusLabels[row.status as keyof typeof quoteStatusLabels]?.fr ?? row.status}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "Priorité",
      secondary: true,
      cell: (row) =>
        quotePriorityLabels[row.priority as keyof typeof quotePriorityLabels]?.fr ?? row.priority,
    },
    { key: "createdAt", header: "Soumis le", cell: (row) => row.createdAt, secondary: true },
    { key: "updatedAt", header: "Mise à jour", cell: (row) => row.updatedAt, secondary: true },
  ];

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title="Devis"
        description={`${actionable} demande(s) en attente d'action — soumises, à l'étude ou en attente d'information.`}
      />

      <AdminFilters
        action={BASE}
        query={readParam(params, "q")}
        searchLabel="Rechercher"
        placeholder="Numéro, projet, client, courriel…"
      >
        <AdminSelect
          name="status"
          label="Statut"
          value={readParam(params, "status")}
          options={quoteStatuses.map((value) => ({ value, label: quoteStatusLabels[value].fr }))}
        />
        <AdminSelect
          name="priority"
          label="Priorité"
          value={readParam(params, "priority")}
          options={quotePriorities.map((value) => ({ value, label: quotePriorityLabels[value].fr }))}
        />
      </AdminFilters>

      <AdminTable
        columns={columns}
        rows={rows}
        empty={{
          title: "Aucune demande de devis",
          description: "Les demandes envoyées depuis le site apparaîtront ici.",
        }}
      />

      <AdminPagination
        page={page}
        pageCount={Math.ceil(total / PAGE_SIZE)}
        buildHref={(target) => buildListHref(BASE, params, target)}
      />
    </>
  );
}
