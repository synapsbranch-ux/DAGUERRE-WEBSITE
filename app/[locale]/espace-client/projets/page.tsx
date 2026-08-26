import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalEmpty, PortalHeader, StatusPill } from "@/components/portal/PortalPage";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { clientProjectStatusLabels, labelOf } from "@/lib/platform/enums";
import { formatDate } from "@/lib/platform/format";
import { requirePortal } from "@/lib/platform/portal";
import { listClientProjects } from "@/lib/platform/queries";
import { href } from "@/lib/routes";

export default async function PortalProjectsPage({
  params,
}: PageProps<"/[locale]/espace-client/projets">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);
  const t = dict.platform.projects;

  const projects = await listClientProjects(portal.session.user.id);
  const base = href("portalProjects", locale);

  return (
    <div className="grid gap-8">
      <PortalHeader eyebrow={dict.platform.portal.title} title={t.title} lead={t.lead} />

      {projects.length === 0 ? (
        <PortalEmpty title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.number}</TableHead>
                <TableHead>{dict.platform.quotes.project}</TableHead>
                <TableHead>{dict.platform.common.status}</TableHead>
                <TableHead className="hidden md:table-cell">{t.start}</TableHead>
                <TableHead className="hidden md:table-cell">{t.target}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-mono text-xs">{project.projectNumber}</TableCell>
                  <TableCell>
                    <Link href={`${base}/${project.id}`} className="font-medium hover:underline">
                      {project.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusPill label={labelOf(clientProjectStatusLabels, project.status, locale)} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {project.startDate ? formatDate(project.startDate, locale) : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {project.targetDate ? formatDate(project.targetDate, locale) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
