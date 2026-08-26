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
import { NewsletterCampaignModel } from "@/lib/db/models/platform";
import { buildListHref, campaignFilter, readPage, readParam } from "@/lib/platform/admin-filters";
import { campaignAudienceLabels, campaignStatusLabels, campaignStatuses } from "@/lib/platform/enums";
import { formatDate } from "@/lib/utils";

const BASE = "/admin/newsletter/campagnes";
const PAGE_SIZE = 25;

type Row = {
  id: string;
  name: string;
  subject: string;
  status: string;
  audience: string;
  recipients: number;
  updatedAt: string;
  sentAt: string;
};

const tone: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  ready: "secondary",
  sending: "secondary",
  sent: "default",
  cancelled: "outline",
  failed: "destructive",
};

/** Liste des campagnes. Aucune action d'envoi ici : elle vit dans la fiche. */
export default async function CampaignsPage({ searchParams }: PageProps<"/admin/newsletter/campagnes">) {
  await requireAdmin();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Campagnes" />;

  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const page = readPage(params);
  const filter = campaignFilter(params);

  const [docs, total] = await Promise.all([
    NewsletterCampaignModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    NewsletterCampaignModel.countDocuments(filter),
  ]);

  const rows: Row[] = (docs as Record<string, unknown>[]).map((doc) => ({
    id: String(doc._id),
    name: String(doc.name ?? ""),
    subject: String(doc.subject ?? ""),
    status: String(doc.status ?? ""),
    audience:
      campaignAudienceLabels[String(doc.audienceType) as keyof typeof campaignAudienceLabels]?.fr ??
      String(doc.audienceType ?? ""),
    recipients: Number(doc.recipientCount ?? 0),
    updatedAt: formatDate(doc.updatedAt),
    sentAt: formatDate(doc.sentAt),
  }));

  const columns: AdminColumn<Row>[] = [
    {
      key: "name",
      header: "Campagne",
      cell: (row) => (
        <Link href={`${BASE}/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    { key: "subject", header: "Objet", cell: (row) => row.subject, secondary: true },
    {
      key: "status",
      header: "Statut",
      cell: (row) => (
        <Badge variant={tone[row.status] ?? "outline"}>
          {campaignStatusLabels[row.status as keyof typeof campaignStatusLabels]?.fr ?? row.status}
        </Badge>
      ),
    },
    { key: "audience", header: "Audience", cell: (row) => row.audience, secondary: true },
    { key: "recipients", header: "Destinataires", cell: (row) => (row.recipients || "—") },
    { key: "sentAt", header: "Envoyée le", cell: (row) => row.sentAt, secondary: true },
    { key: "updatedAt", header: "Modifiée le", cell: (row) => row.updatedAt, secondary: true },
  ];

  return (
    <>
      <AdminPageHeader
        group="Marketing"
        title="Campagnes"
        description="Rédiger, prévisualiser, tester puis envoyer une infolettre. L'envoi se déclenche depuis la fiche d'une campagne, jamais depuis cette liste."
        actions={
          <Button asChild>
            <Link href={`${BASE}/new`}>Créer une campagne</Link>
          </Button>
        }
      />

      <AdminFilters action={BASE} query={readParam(params, "q")} searchLabel="Rechercher" placeholder="Nom, objet…">
        <AdminSelect
          name="status"
          label="Statut"
          value={readParam(params, "status")}
          options={campaignStatuses.map((value) => ({ value, label: campaignStatusLabels[value].fr }))}
        />
      </AdminFilters>

      <AdminTable
        columns={columns}
        rows={rows}
        empty={{
          title: "Aucune campagne",
          description: "Créez votre première infolettre.",
          ctaLabel: "Créer une campagne",
          ctaHref: `${BASE}/new`,
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
