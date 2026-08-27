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
import { ContractModel, ContractSignerModel } from "@/lib/db/models/platform";
import { buildListHref, readPage, readParam } from "@/lib/platform/admin-filters";
import { contractStatusLabels, contractStatuses, type ContractStatus } from "@/lib/platform/enums";
import { formatDate } from "@/lib/utils";

const BASE = "/admin/contrats";
const PAGE_SIZE = 25;

type Doc = Record<string, unknown>;

type Row = {
  id: string;
  number: string;
  title: string;
  status: ContractStatus;
  progress: string;
  sent: string;
};

/**
 * Liste des contrats.
 *
 * L'avancement — « 1 / 3 signé » — est ce qui manque à un statut seul : savoir
 * qu'un contrat est « partiellement signé » ne dit pas s'il reste une partie ou
 * cinq. Le décompte se fait en une agrégation, pas en une requête par ligne.
 */
export default async function AdminContractsPage({ searchParams }: PageProps<"/admin/contrats">) {
  await requireAdmin();

  if (!(await tryConnectToDatabase())) return <AdminDatabaseError title="Contrats" />;

  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const page = readPage(params);
  const status = readParam(params, "statut");
  const search = readParam(params, "q");

  const filter: Record<string, unknown> = {};
  if ((contractStatuses as readonly string[]).includes(status)) filter.status = status;
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    filter.$or = [{ contractNumber: regex }, { title: regex }];
  }

  const [docs, total] = await Promise.all([
    ContractModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    ContractModel.countDocuments(filter),
  ]);

  const ids = (docs as Doc[]).map((doc) => doc._id);

  const counts = (await ContractSignerModel.aggregate([
    { $match: { contractId: { $in: ids } } },
    {
      $group: {
        _id: "$contractId",
        total: { $sum: 1 },
        signed: { $sum: { $cond: [{ $eq: ["$status", "signed"] }, 1, 0] } },
      },
    },
  ])) as { _id: unknown; total: number; signed: number }[];

  const byContract = new Map(counts.map((entry) => [String(entry._id), entry]));

  const rows: Row[] = (docs as Doc[]).map((doc) => {
    const count = byContract.get(String(doc._id));
    return {
      id: String(doc._id),
      number: String(doc.contractNumber ?? ""),
      title: String(doc.title ?? ""),
      status: String(doc.status ?? "draft") as ContractStatus,
      progress: count ? `${count.signed} / ${count.total}` : "—",
      sent: formatDate(doc.sentAt),
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
    { key: "title", header: "Titre", cell: (row) => row.title },
    {
      key: "status",
      header: "Statut",
      cell: (row) => (
        <Badge
          variant={
            row.status === "signed"
              ? "default"
              : row.status === "declined" || row.status === "expired"
                ? "destructive"
                : "outline"
          }
        >
          {contractStatusLabels[row.status]?.fr ?? row.status}
        </Badge>
      ),
    },
    { key: "progress", header: "Signatures", cell: (row) => row.progress },
    { key: "sent", header: "Envoyé le", cell: (row) => row.sent, secondary: true },
  ];

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title="Contrats"
        description="Signature électronique simple, avec piste d'audit. Un contrat envoyé ne se modifie plus."
        actions={
          <Button asChild>
            <Link href={`${BASE}/new`}>Nouveau contrat</Link>
          </Button>
        }
      />

      <AdminFilters action={BASE} query={search} searchLabel="Rechercher" placeholder="Numéro, titre…">
        <AdminSelect
          name="statut"
          label="Statut"
          value={status}
          options={[
            { value: "", label: "Tous" },
            ...contractStatuses.map((value) => ({ value, label: contractStatusLabels[value].fr })),
          ]}
        />
      </AdminFilters>

      <AdminTable
        columns={columns}
        rows={rows}
        empty={{
          title: "Aucun contrat",
          description: "Rédigez une entente ici, ou déposez un PDF à faire signer.",
          ctaLabel: "Nouveau contrat",
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
