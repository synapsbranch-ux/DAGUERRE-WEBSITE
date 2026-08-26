import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDatabaseError, AdminPageHeader } from "@/components/admin/AdminTable";
import { ProjectWorkspace } from "@/components/admin/ProjectWorkspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { ClientProjectModel } from "@/lib/db/models/platform";
import { validObjectId } from "@/lib/http";
import { clientProjectStatusLabels } from "@/lib/platform/enums";
import { formatBytes } from "@/lib/platform/format";
import { listProjectFiles, listProjectUpdates, toProjectSummary } from "@/lib/platform/queries";
import { accountLabel, findAccount } from "@/lib/platform/users";
import { formatDate } from "@/lib/utils";

/** Champ `date` : « 2026-04-20 ». */
function toDateInput(value: string): string {
  return value ? value.slice(0, 10) : "";
}

export default async function AdminProjectPage({ params }: PageProps<"/admin/projets-clients/[id]">) {
  await requireAdmin();

  const { id } = await params;
  if (!validObjectId(id)) notFound();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Projet" />;

  const doc = (await ClientProjectModel.findById(id).lean()) as Record<string, unknown> | null;
  if (!doc) notFound();

  const project = toProjectSummary(doc);
  const [updates, files, account] = await Promise.all([
    listProjectUpdates(id),
    listProjectFiles(id),
    findAccount(project.clientId),
  ]);

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title={project.title}
        description={`${project.projectNumber}${account ? ` · ${accountLabel(account)}` : ""}`}
        actions={
          <>
            <Badge variant={project.status === "active" ? "default" : "outline"}>
              {clientProjectStatusLabels[project.status as keyof typeof clientProjectStatusLabels]?.fr ??
                project.status}
            </Badge>
            <Button asChild variant="secondary">
              <Link href="/admin/projets-clients">Retour</Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {project.quoteRequestId ? (
          <Link href={`/admin/devis/${project.quoteRequestId}`} className="underline underline-offset-4">
            Devis d&apos;origine
          </Link>
        ) : null}
        {account ? (
          <Link href={`/admin/clients/${account.id}`} className="underline underline-offset-4">
            Fiche client
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <ProjectWorkspace
          projectId={id}
          clientId={project.clientId}
          initial={{
            title: project.title,
            description: project.description,
            status: project.status,
            startDate: toDateInput(project.startDate),
            targetDate: toDateInput(project.targetDate),
            completedAt: toDateInput(project.completedAt),
          }}
        />

        <aside className="grid gap-8">
          <section className="rounded-lg border border-border p-5">
            <h2 className="font-heading text-lg">Avancements publiés</h2>
            {updates.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Aucun avancement publié.</p>
            ) : (
              <ol className="mt-4 grid gap-3">
                {updates.map((update) => (
                  <li key={update.id} className="rounded-md border border-border p-3">
                    <p className="text-xs text-muted-foreground">{formatDate(update.createdAt)}</p>
                    <p className="mt-1 text-sm font-medium">{update.title}</p>
                    {update.body ? (
                      <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{update.body}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-lg border border-border p-5">
            <h2 className="font-heading text-lg">Documents</h2>
            {files.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Aucun document.</p>
            ) : (
              <ul className="mt-4 grid gap-2 text-sm">
                {files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3">
                    <a
                      href={`/api/files/${file.id}`}
                      rel="nofollow"
                      className="min-w-0 flex-1 truncate underline underline-offset-4"
                    >
                      {file.filename}
                    </a>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBytes(file.size, "fr")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
