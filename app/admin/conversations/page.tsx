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
import { ConversationModel } from "@/lib/db/models/platform";
import { buildListHref, conversationFilter, readPage, readParam } from "@/lib/platform/admin-filters";
import { conversationStatusLabels, conversationStatuses } from "@/lib/platform/enums";
import { accountLabel, accountsById } from "@/lib/platform/users";
import { formatDate } from "@/lib/utils";

const BASE = "/admin/conversations";
const PAGE_SIZE = 25;

type Row = {
  id: string;
  subject: string;
  client: string;
  status: string;
  unread: number;
  lastMessageAt: string;
};

/** Boîte de réception de l'administration, tous clients confondus. */
export default async function AdminConversationsPage({
  searchParams,
}: PageProps<"/admin/conversations">) {
  await requireAdmin();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Conversations" />;

  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const page = readPage(params);
  const filter = conversationFilter(params);

  const [docs, total, unreadTotal] = await Promise.all([
    ConversationModel.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    ConversationModel.countDocuments(filter),
    ConversationModel.countDocuments({ unreadForAdmin: { $gt: 0 } }),
  ]);

  const rowsRaw = docs as Record<string, unknown>[];
  const accounts = await accountsById(rowsRaw.map((doc) => String(doc.clientId ?? "")));

  const rows: Row[] = rowsRaw.map((doc) => {
    const account = accounts.get(String(doc.clientId ?? ""));
    return {
      id: String(doc._id),
      subject: String(doc.subject ?? "Conversation"),
      client: account ? accountLabel(account) : "—",
      status: String(doc.status ?? ""),
      unread: Number(doc.unreadForAdmin ?? 0),
      lastMessageAt: formatDate(doc.lastMessageAt),
    };
  });

  const columns: AdminColumn<Row>[] = [
    {
      key: "subject",
      header: "Objet",
      cell: (row) => (
        <Link href={`${BASE}/${row.id}`} className="font-medium hover:underline">
          {row.subject}
        </Link>
      ),
    },
    { key: "client", header: "Client", cell: (row) => row.client, secondary: true },
    {
      key: "unread",
      header: "Non lus",
      cell: (row) => (row.unread > 0 ? <Badge>{row.unread}</Badge> : "—"),
    },
    {
      key: "status",
      header: "État",
      cell: (row) => (
        <Badge variant={row.status === "open" ? "secondary" : "outline"}>
          {conversationStatusLabels[row.status as keyof typeof conversationStatusLabels]?.fr ??
            row.status}
        </Badge>
      ),
    },
    { key: "lastMessageAt", header: "Dernier message", cell: (row) => row.lastMessageAt },
  ];

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title="Conversations"
        description={`${unreadTotal} conversation(s) avec des messages non lus.`}
      />

      <AdminFilters action={BASE} query={readParam(params, "q")} searchLabel="Rechercher" placeholder="Objet…">
        <AdminSelect
          name="status"
          label="État"
          value={readParam(params, "status")}
          options={conversationStatuses.map((value) => ({
            value,
            label: conversationStatusLabels[value].fr,
          }))}
        />
        <AdminSelect
          name="unread"
          label="Non lus"
          value={readParam(params, "unread")}
          options={[{ value: "1", label: "Seulement les non lus" }]}
          anyLabel="Toutes"
        />
      </AdminFilters>

      <AdminTable
        columns={columns}
        rows={rows}
        empty={{
          title: "Aucune conversation",
          description: "Les échanges ouverts par vos clients apparaîtront ici.",
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
