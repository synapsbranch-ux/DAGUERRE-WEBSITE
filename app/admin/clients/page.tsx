import Link from "next/link";

import {
  AdminDatabaseError,
  AdminFilters,
  AdminPageHeader,
  AdminPagination,
  AdminTable,
  type AdminColumn,
} from "@/components/admin/AdminTable";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { ClientProfileModel, QuoteRequestModel } from "@/lib/db/models/platform";
import { buildListHref, readPage, readParam } from "@/lib/platform/admin-filters";
import { listClientAccounts } from "@/lib/platform/users";
import { formatDate } from "@/lib/utils";

const BASE = "/admin/clients";
const PAGE_SIZE = 25;

type Row = {
  id: string;
  name: string;
  email: string;
  company: string;
  verified: boolean;
  quotes: number;
  createdAt: string;
};

/**
 * Comptes clients.
 *
 * Les comptes appartiennent à Logto ; cette page lit leur miroir local sans
 * jamais toucher aux identifiants. **Aucun mot de passe n'est lisible ni
 * réinitialisable d'ici** : ils ne sont pas dans cette base, et c'est
 * exactement ce qu'on attend d'eux.
 */
export default async function AdminClientsPage({ searchParams }: PageProps<"/admin/clients">) {
  await requireAdmin();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Clients" />;

  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const page = readPage(params);
  const query = readParam(params, "q");

  const accounts = await listClientAccounts({ query, page, limit: PAGE_SIZE });
  const ids = accounts.items.map((account) => account.id);

  const [profiles, quoteCounts] = await Promise.all([
    ClientProfileModel.find({ userId: { $in: ids } })
      .select("userId companyName")
      .lean(),
    Promise.all(ids.map((id) => QuoteRequestModel.countDocuments({ userId: id }))),
  ]);

  const companyById = new Map(
    (profiles as Record<string, unknown>[]).map((profile) => [
      String(profile.userId),
      String(profile.companyName ?? ""),
    ]),
  );

  const rows: Row[] = accounts.items.map((account, index) => ({
    id: account.id,
    name: account.name,
    email: account.email,
    company: companyById.get(account.id) ?? "",
    verified: account.emailVerified,
    quotes: quoteCounts[index] ?? 0,
    createdAt: formatDate(account.createdAt),
  }));

  const columns: AdminColumn<Row>[] = [
    {
      key: "name",
      header: "Client",
      cell: (row) => (
        <Link href={`${BASE}/${row.id}`} className="font-medium hover:underline">
          {row.name || row.email}
        </Link>
      ),
    },
    { key: "email", header: "Courriel", cell: (row) => row.email, secondary: true },
    { key: "company", header: "Organisation", cell: (row) => row.company || "—", secondary: true },
    {
      key: "verified",
      header: "Adresse",
      cell: (row) => (
        <Badge variant={row.verified ? "default" : "outline"}>
          {row.verified ? "Vérifiée" : "Non vérifiée"}
        </Badge>
      ),
    },
    { key: "quotes", header: "Devis", cell: (row) => row.quotes },
    { key: "createdAt", header: "Compte ouvert le", cell: (row) => row.createdAt, secondary: true },
  ];

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title="Clients"
        description="Comptes ouverts depuis le site. Les mots de passe ne sont ni lisibles ni modifiables d'ici."
      />

      <AdminFilters action={BASE} query={query} searchLabel="Rechercher" placeholder="Nom, courriel…" />

      <AdminTable
        columns={columns}
        rows={rows}
        empty={{
          title: "Aucun compte client",
          description: "Les comptes créés depuis le site apparaîtront ici.",
        }}
      />

      <AdminPagination
        page={page}
        pageCount={Math.ceil(accounts.total / PAGE_SIZE)}
        buildHref={(target) => buildListHref(BASE, params, target)}
      />
    </>
  );
}
