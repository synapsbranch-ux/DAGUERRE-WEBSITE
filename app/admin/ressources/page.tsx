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
import { CategoryManager, type CategoryRow } from "@/components/admin/CategoryManager";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { ContentResourceModel, ResourceCategoryModel } from "@/lib/db/models/platform";
import { buildListHref, readPage, readParam, resourceFilter } from "@/lib/platform/admin-filters";
import {
  resourceTypeLabels,
  resourceTypes,
  resourceVisibilities,
  resourceVisibilityLabels,
} from "@/lib/platform/enums";
import { formatDate } from "@/lib/utils";

const BASE = "/admin/ressources";
const PAGE_SIZE = 25;

type Row = {
  id: string;
  title: string;
  slug: string;
  type: string;
  visibility: string;
  status: string;
  downloads: number;
  publishedAt: string;
  updatedAt: string;
};

/**
 * Bibliothèque de ressources.
 *
 * Le nombre de téléchargements est réel : il vient du compteur incrémenté à
 * chaque service de fichier autorisé, jamais d'une estimation.
 */
export default async function AdminResourcesPage({ searchParams }: PageProps<"/admin/ressources">) {
  await requireAdmin();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Ressources" />;

  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const page = readPage(params);
  const filter = resourceFilter(params);

  const [docs, total, categoryDocs] = await Promise.all([
    ContentResourceModel.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    ContentResourceModel.countDocuments(filter),
    ResourceCategoryModel.find().sort({ order: 1 }).lean(),
  ]);

  const categoryCounts = await Promise.all(
    (categoryDocs as Record<string, unknown>[]).map((category) =>
      ContentResourceModel.countDocuments({ categoryId: category._id }),
    ),
  );

  const categories: CategoryRow[] = (categoryDocs as Record<string, unknown>[]).map((doc, index) => ({
    id: String(doc._id),
    slug: String(doc.slug ?? ""),
    nameFr: String((doc.name as { fr?: string } | undefined)?.fr ?? ""),
    nameEn: String((doc.name as { en?: string } | undefined)?.en ?? ""),
    count: categoryCounts[index] ?? 0,
  }));

  const rows: Row[] = (docs as Record<string, unknown>[]).map((doc) => ({
    id: String(doc._id),
    title: String((doc.title as { fr?: string } | undefined)?.fr ?? "Sans titre"),
    slug: String((doc.slug as { fr?: string } | undefined)?.fr ?? ""),
    type: String(doc.type ?? ""),
    visibility: String(doc.visibility ?? ""),
    status: String(doc.status ?? "draft"),
    downloads: Number(doc.downloadCount ?? 0),
    publishedAt: formatDate(doc.publishedAt),
    updatedAt: formatDate(doc.updatedAt),
  }));

  const columns: AdminColumn<Row>[] = [
    {
      key: "title",
      header: "Ressource",
      cell: (row) => (
        <Link href={`${BASE}/${row.id}`} className="font-medium hover:underline">
          {row.title}
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => resourceTypeLabels[row.type as keyof typeof resourceTypeLabels]?.fr ?? row.type,
      secondary: true,
    },
    {
      key: "visibility",
      header: "Portée",
      cell: (row) => (
        <Badge variant={row.visibility === "public" ? "outline" : "secondary"}>
          {resourceVisibilityLabels[row.visibility as keyof typeof resourceVisibilityLabels]?.fr ??
            row.visibility}
        </Badge>
      ),
    },
    { key: "status", header: "État", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "downloads", header: "Téléchargements", cell: (row) => row.downloads },
    { key: "publishedAt", header: "Publiée le", cell: (row) => row.publishedAt, secondary: true },
    { key: "updatedAt", header: "Modifiée le", cell: (row) => row.updatedAt, secondary: true },
  ];

  return (
    <>
      <AdminPageHeader
        group="Contenus"
        title="Ressources"
        description="Rapports, guides, gabarits et jeux de données mis à disposition du public ou des clients."
        actions={
          <Button asChild>
            <Link href={`${BASE}/new`}>Créer une ressource</Link>
          </Button>
        }
      />

      <AdminFilters action={BASE} query={readParam(params, "q")} searchLabel="Rechercher" placeholder="Titre, description…">
        <AdminSelect
          name="status"
          label="État"
          value={readParam(params, "status")}
          options={[
            { value: "draft", label: "Brouillon" },
            { value: "published", label: "Publiée" },
            { value: "archived", label: "Archivée" },
          ]}
        />
        <AdminSelect
          name="visibility"
          label="Portée"
          value={readParam(params, "visibility")}
          options={resourceVisibilities.map((value) => ({
            value,
            label: resourceVisibilityLabels[value].fr,
          }))}
        />
        <AdminSelect
          name="type"
          label="Type"
          value={readParam(params, "type")}
          options={resourceTypes.map((value) => ({ value, label: resourceTypeLabels[value].fr }))}
        />
        <AdminSelect
          name="category"
          label="Catégorie"
          value={readParam(params, "category")}
          options={categories.map((category) => ({ value: category.id, label: category.nameFr }))}
        />
      </AdminFilters>

      <CategoryManager categories={categories} />

      <AdminTable
        columns={columns}
        rows={rows}
        empty={{
          title: "Aucune ressource",
          description: "Déposez votre premier document.",
          ctaLabel: "Créer une ressource",
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
