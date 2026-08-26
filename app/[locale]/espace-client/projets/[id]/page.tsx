import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalHeader, PortalPanel, StatusPill } from "@/components/portal/PortalPage";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { validObjectId } from "@/lib/http";
import { clientProjectStatusLabels, labelOf } from "@/lib/platform/enums";
import { formatBytes, formatDate } from "@/lib/platform/format";
import { requirePortal } from "@/lib/platform/portal";
import {
  findClientProject,
  listProjectFiles,
  listProjectUpdates,
} from "@/lib/platform/queries";
import { href } from "@/lib/routes";

/**
 * Fiche d'un projet client.
 *
 * `findClientProject` porte l'appartenance dans la requête. Les documents
 * listés ici sont ceux du projet ; leur téléchargement repasse malgré tout
 * par `/api/files/[id]`, qui revérifie les droits — une liste rendue n'est
 * jamais une autorisation.
 */
export default async function PortalProjectPage({
  params,
}: PageProps<"/[locale]/espace-client/projets/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !validObjectId(id)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);
  const t = dict.platform.projects;

  const project = await findClientProject(portal.session.user.id, id);
  if (!project) notFound();

  const [updates, files] = await Promise.all([listProjectUpdates(id), listProjectFiles(id)]);

  return (
    <div className="grid gap-10">
      <PortalHeader
        eyebrow={project.projectNumber}
        title={project.title}
        lead={project.description || undefined}
        actions={<StatusPill tone="default" label={labelOf(clientProjectStatusLabels, project.status, locale)} />}
      />

      <dl className="flex flex-wrap gap-x-10 gap-y-3 border-y border-border py-5 text-sm">
        {project.startDate ? (
          <div>
            <dt className="text-muted-foreground">{t.start}</dt>
            <dd>{formatDate(project.startDate, locale)}</dd>
          </div>
        ) : null}
        {project.targetDate ? (
          <div>
            <dt className="text-muted-foreground">{t.target}</dt>
            <dd>{formatDate(project.targetDate, locale)}</dd>
          </div>
        ) : null}
        {project.completedAt ? (
          <div>
            <dt className="text-muted-foreground">{t.completed}</dt>
            <dd>{formatDate(project.completedAt, locale)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <PortalPanel title={t.updates}>
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.common.empty}</p>
          ) : (
            <ol className="grid gap-4">
              {updates.map((update) => (
                <li key={update.id} className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">{formatDate(update.createdAt, locale)}</p>
                  <p className="mt-1 font-medium">{update.title}</p>
                  {update.body ? (
                    <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{update.body}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </PortalPanel>

        <aside className="grid gap-8">
          <PortalPanel title={t.documents}>
            {files.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dict.common.empty}</p>
            ) : (
              <ul className="grid gap-2 text-sm">
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
                      {formatBytes(file.size, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PortalPanel>

          {project.quoteRequestId ? (
            <Link
              href={href("portalQuotes", locale, project.quoteRequestId)}
              className="text-sm underline underline-offset-4"
            >
              {dict.platform.messages.linkedQuote}
            </Link>
          ) : null}

          <Link href={href("portalProjects", locale)} className="text-sm underline underline-offset-4">
            {t.title}
          </Link>
        </aside>
      </div>
    </div>
  );
}
