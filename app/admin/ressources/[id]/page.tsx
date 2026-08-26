import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDatabaseError, AdminPageHeader } from "@/components/admin/AdminTable";
import { ContentResourceForm, type ResourceValue } from "@/components/admin/forms/ContentResourceForm";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import {
  ContentDownloadModel,
  ContentResourceModel,
  ResourceCategoryModel,
  StoredFileModel,
} from "@/lib/db/models/platform";
import { validObjectId } from "@/lib/http";
import { accountLabel, accountsById, listClientAccounts } from "@/lib/platform/users";
import { formatDate } from "@/lib/utils";

type Localized = { fr?: string; en?: string };

/** Champ `datetime-local` : « 2026-04-20T17:00 », en heure locale du navigateur. */
function toLocalInput(value: unknown): string {
  if (!(value instanceof Date)) return "";
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

export default async function EditResourcePage({ params }: PageProps<"/admin/ressources/[id]">) {
  await requireAdmin();

  const { id } = await params;
  if (!validObjectId(id)) notFound();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Ressource" />;

  const doc = (await ContentResourceModel.findById(id).lean()) as Record<string, unknown> | null;
  if (!doc) notFound();

  const [categoryDocs, accounts, file, downloads] = await Promise.all([
    ResourceCategoryModel.find().sort({ order: 1 }).lean(),
    listClientAccounts({ limit: 200 }),
    doc.fileId
      ? (StoredFileModel.findById(doc.fileId).select("originalFilename size").lean() as Promise<
          { originalFilename?: string; size?: number } | null
        >)
      : Promise.resolve(null),
    ContentDownloadModel.find({ resourceId: id }).sort({ downloadedAt: -1 }).limit(10).lean(),
  ]);

  const downloadRows = downloads as Record<string, unknown>[];
  const downloaders = await accountsById(
    downloadRows.map((row) => String(row.userId ?? "")).filter(Boolean),
  );

  const localized = (key: string): { fr: string; en: string } => {
    const value = doc[key] as Localized | undefined;
    return { fr: String(value?.fr ?? ""), en: String(value?.en ?? "") };
  };

  const initial: ResourceValue = {
    slug: localized("slug"),
    title: localized("title"),
    description: localized("description"),
    body: localized("body"),
    type: String(doc.type ?? "pdf"),
    visibility: String(doc.visibility ?? "public"),
    status: (String(doc.status ?? "draft") as ResourceValue["status"]),
    coverImage: String(doc.coverImage ?? ""),
    fileId: doc.fileId ? String(doc.fileId) : "",
    fileName: String(file?.originalFilename ?? ""),
    fileSize: Number(file?.size ?? 0),
    externalUrl: String(doc.externalUrl ?? ""),
    categoryId: doc.categoryId ? String(doc.categoryId) : "",
    allowedUserIds: Array.isArray(doc.allowedUserIds) ? (doc.allowedUserIds as string[]) : [],
    publishedAt: toLocalInput(doc.publishedAt),
  };

  return (
    <>
      <AdminPageHeader
        group="Contenus"
        title={initial.title.fr || "Ressource"}
        description={`${Number(doc.downloadCount ?? 0)} téléchargement(s) enregistré(s).`}
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/ressources">Retour à la liste</Link>
          </Button>
        }
      />

      <div className="mt-8">
        <ContentResourceForm
          id={id}
          initial={initial}
          categories={(categoryDocs as Record<string, unknown>[]).map((entry) => ({
            id: String(entry._id),
            name: String((entry.name as Localized | undefined)?.fr ?? ""),
          }))}
          clients={accounts.items.map((account) => ({ id: account.id, label: accountLabel(account) }))}
        />
      </div>

      {downloadRows.length > 0 ? (
        <section className="mt-10 max-w-4xl">
          <h2 className="font-heading text-xl">Derniers téléchargements</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border text-sm">
            {downloadRows.map((row) => {
              const userId = String(row.userId ?? "");
              const account = userId ? downloaders.get(userId) : undefined;
              return (
                <li key={String(row._id)} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate">
                    {account ? accountLabel(account) : "Visiteur anonyme"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(row.downloadedAt)}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Les téléchargements anonymes ne conservent aucune donnée identifiante.
          </p>
        </section>
      ) : null}
    </>
  );
}
