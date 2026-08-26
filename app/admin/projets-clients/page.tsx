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
import { ClientProjectModel } from "@/lib/db/models/platform";
import { buildListHref, clientProjectFilter, readPage, readParam } from "@/lib/platform/admin-filters";
import { clientProjectStatusLabels, clientProjectStatuses } from "@/lib/platform/enums";
import { accountLabel, accountsById } from "@/lib/platform/users";
import { formatDate } from "@/lib/utils";

const BASE = "/admin/projets-clients";
const PAGE_SIZE = 25;

type Row = {
  id: string;
  projectNumber: string;
  title: string;
  client: string;
  status: string;
  targetDate: string;
  updatedAt: string;
};

/**
 * Projets clients.
 *
 * Un projet naît d'un devis accepté : il n'y a pas de bouton « créer un
 * projet » ici. Ouvrir un mandat sans offre validée déconnecterait le suivi de
 * ce qui a réellement été convenu.
 */
export default async function AdminProjectsPage({
  searchParams,
}: PageProps<"/admin/projets-clients">) {
  await requireAdmin();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Projets" />;

  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const page = readPage(params);
  const filter = clientProjectFilter(params);

  const [docs, total] = await Promise.all([
    ClientProjectModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    ClientProjectModel.countDocuments(filter),
  ]);

  const rowsRaw = docs as Record<string, unknown>[];
  const accounts = await accountsById(rowsRaw.map((doc) => String(doc.clientId ?? "")));

  const rows: Row[] = rowsRaw.map((doc) => {
    const account = accounts.get(String(doc.clientId ?? ""));
    return {
      id: String(doc._id),
      projectNumber: String(doc.projectNumber ?? ""),
      title: String(doc.title ?? ""),
      client: account ? accountLabel(account) : "—",
      status: String(doc.status ?? ""),
      targetDate: formatDate(doc.targetDate),
      updatedAt: formatDate(doc.updatedAt),
    };
  });

  const columns: AdminColumn<Row>[] = [
    {
      key: "projectNumber",
      header: "Projet",
      cell: (row) => (
        <Link href={`${BASE}/${row.id}`} className="font-mono text-xs hover:underline">
          {row.projectNumber}
        </Link>
      ),
    },
    {
      key: "title",
      header: "Titre",
      cell: (row) => (
        <Link href={`${BASE}/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </Link>
      ),
    },
    { key: "client", header: "Client", cell: (row) => row.client, secondary: true },
    {
      key: "status",
      header: "État",
      cell: (row) => (
        <Badge variant={row.status === "active" ? "default" : "outline"}>
          {clientProjectStatusLabels[row.status as keyof typeof clientProjectStatusLabels]?.fr ??
            row.status}
        </Badge>
      ),
    },
    { key: "targetDate", header: "Échéance", cell: (row) => row.targetDate, secondary: true },
    { key: "updatedAt", header: "Mise à jour", cell: (row) => row.updatedAt, secondary: true },
  ];

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title="Projets"
        description="Un projet s'ouvre depuis un devis accepté, sur sa fiche."
      />

      <AdminFilters action={BASE} query={readParam(params, "q")} searchLabel="Rechercher" placeholder="Numéro, titre…">
        <AdminSelect
          name="status"
          label="État"
          value={readParam(params, "status")}
          options={clientProjectStatuses.map((value) => ({
            value,
            label: clientProjectStatusLabels[value].fr,
          }))}
        />
      </AdminFilters>

      <AdminTable
        columns={columns}
        rows={rows}
        empty={{
          title: "Aucun projet",
          description: "Acceptez un devis puis ouvrez le projet depuis sa fiche.",
          ctaLabel: "Voir les devis",
          ctaHref: "/admin/devis",
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
