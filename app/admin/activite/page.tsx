import {
  AdminDatabaseError,
  AdminFilters,
  AdminPageHeader,
  AdminPagination,
  AdminSelect,
  AdminTable,
  type AdminColumn,
} from "@/components/admin/AdminTable";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { AdminAuditLogModel } from "@/lib/db/models/platform";
import { buildListHref, readPage, readParam, searchRegex } from "@/lib/platform/admin-filters";
import type { PlatformFilter } from "@/lib/platform/filters";
import { auditActionLabels, auditActions, isMember } from "@/lib/platform/enums";
import { formatDate } from "@/lib/utils";

const BASE = "/admin/activite";
const PAGE_SIZE = 50;

type Row = {
  id: string;
  action: string;
  entity: string;
  actor: string;
  detail: string;
  createdAt: string;
};

/**
 * Journal des actions administratives.
 *
 * Il répond à « qui a changé quoi, et quand ». On n'y trouve ni mot de passe,
 * ni jeton, ni contenu de message privé : le journal sert à retracer une
 * décision, pas à dupliquer les données qu'elle concerne.
 */
export default async function AdminActivityPage({ searchParams }: PageProps<"/admin/activite">) {
  await requireAdmin();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Activité" />;

  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const page = readPage(params);
  const query = readParam(params, "q");
  const action = readParam(params, "action", 60);

  const conditions: PlatformFilter[] = [];
  if (query) {
    const regex = searchRegex(query);
    conditions.push({ $or: [{ actorEmail: regex }, { entityType: regex }, { entityId: regex }] });
  }
  if (isMember(auditActions, action)) conditions.push({ action });

  const filter: PlatformFilter = conditions.length ? { $and: conditions } : {};

  const [docs, total] = await Promise.all([
    AdminAuditLogModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    AdminAuditLogModel.countDocuments(filter),
  ]);

  const rows: Row[] = (docs as Record<string, unknown>[]).map((doc) => {
    const metadata = (doc.metadata ?? {}) as Record<string, unknown>;
    const detail = Object.entries(metadata)
      .filter(([, value]) => value !== "" && value !== null && value !== undefined)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(" · ");

    return {
      id: String(doc._id),
      action:
        auditActionLabels[String(doc.action) as keyof typeof auditActionLabels]?.fr ??
        String(doc.action ?? ""),
      entity: `${String(doc.entityType ?? "")}${doc.entityId ? ` ${String(doc.entityId).slice(-6)}` : ""}`,
      actor: String(doc.actorEmail ?? "—"),
      detail: detail.slice(0, 200),
      createdAt: formatDate(doc.createdAt),
    };
  });

  const columns: AdminColumn<Row>[] = [
    { key: "createdAt", header: "Date", cell: (row) => row.createdAt },
    { key: "action", header: "Action", cell: (row) => <span className="font-medium">{row.action}</span> },
    { key: "actor", header: "Auteur", cell: (row) => row.actor, secondary: true },
    { key: "entity", header: "Objet", cell: (row) => row.entity, secondary: true },
    {
      key: "detail",
      header: "Détail",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.detail || "—"}</span>,
      secondary: true,
    },
  ];

  return (
    <>
      <AdminPageHeader
        group="Système"
        title="Activité"
        description={`${total} action(s) enregistrée(s). Aucun mot de passe, jeton ou message privé n'y figure.`}
      />

      <AdminFilters action={BASE} query={query} searchLabel="Rechercher" placeholder="Auteur, objet…">
        <AdminSelect
          name="action"
          label="Action"
          value={action}
          options={auditActions.map((value) => ({ value, label: auditActionLabels[value].fr }))}
        />
      </AdminFilters>

      <AdminTable
        columns={columns}
        rows={rows}
        empty={{
          title: "Aucune action enregistrée",
          description: "Les changements de statut, envois et publications apparaîtront ici.",
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
