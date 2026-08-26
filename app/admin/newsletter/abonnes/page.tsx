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
import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { AddSubscriber } from "@/components/admin/AddSubscriber";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { NewsletterSubscriberModel } from "@/lib/db/models/platform";
import {
  subscriberSourceLabels,
  subscriberSources,
  subscriberStatusLabels,
  subscriberStatuses,
} from "@/lib/platform/enums";
import { buildListHref, readPage, readParam, subscriberFilter } from "@/lib/platform/admin-filters";
import { formatDate } from "@/lib/utils";

const BASE = "/admin/newsletter/abonnes";
const PAGE_SIZE = 30;

type Row = {
  id: string;
  email: string;
  name: string;
  status: string;
  source: string;
  locale: string;
  createdAt: string;
  lastActivity: string;
};

const tone: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  pending: "secondary",
  unsubscribed: "outline",
  bounced: "destructive",
  complained: "destructive",
};

/**
 * Abonnés à l'infolettre.
 *
 * Recherche, filtres et pagination sont faits **en base** : la liste peut
 * compter des dizaines de milliers de lignes, les charger toutes pour filtrer
 * dans le navigateur serait à la fois lent et indiscret.
 */
export default async function SubscribersPage({ searchParams }: PageProps<"/admin/newsletter/abonnes">) {
  await requireAdmin();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Abonnés" />;

  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const page = readPage(params);
  const filter = subscriberFilter(params);

  const [docs, total, activeCount] = await Promise.all([
    NewsletterSubscriberModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    NewsletterSubscriberModel.countDocuments(filter),
    NewsletterSubscriberModel.countDocuments({ status: "active" }),
  ]);

  const rows: Row[] = (docs as Record<string, unknown>[]).map((doc) => ({
    id: String(doc._id),
    email: String(doc.email ?? ""),
    name: [doc.firstName, doc.lastName].filter(Boolean).join(" "),
    status: String(doc.status ?? ""),
    source: String(doc.source ?? ""),
    locale: String(doc.locale ?? ""),
    createdAt: formatDate(doc.createdAt),
    lastActivity: formatDate(doc.confirmedAt ?? doc.unsubscribedAt ?? doc.lastActivityAt ?? doc.updatedAt),
  }));

  const columns: AdminColumn<Row>[] = [
    { key: "email", header: "Courriel", cell: (row) => <span className="font-medium">{row.email}</span> },
    { key: "name", header: "Nom", cell: (row) => row.name || "—", secondary: true },
    {
      key: "status",
      header: "Statut",
      cell: (row) => (
        <Badge variant={tone[row.status] ?? "outline"}>
          {subscriberStatusLabels[row.status as keyof typeof subscriberStatusLabels]?.fr ?? row.status}
        </Badge>
      ),
    },
    {
      key: "source",
      header: "Source",
      secondary: true,
      cell: (row) =>
        subscriberSourceLabels[row.source as keyof typeof subscriberSourceLabels]?.fr ?? row.source,
    },
    { key: "locale", header: "Langue", cell: (row) => row.locale.toUpperCase(), secondary: true },
    { key: "createdAt", header: "Inscrit le", cell: (row) => row.createdAt, secondary: true },
    { key: "lastActivity", header: "Dernière activité", cell: (row) => row.lastActivity, secondary: true },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-1.5">
          {row.status === "unsubscribed" || row.status === "pending" ? (
            <ConfirmAction
              trigger="Réactiver"
              title="Réactiver cet abonné ?"
              description="À n'utiliser que sur demande explicite de la personne concernée. L'action est journalisée."
              confirmLabel="Réactiver"
              endpoint={`/api/admin/newsletter/subscribers/${row.id}`}
              method="PATCH"
              body={{ status: "active" }}
              variant="ghost"
              size="sm"
            />
          ) : null}
          {row.status !== "unsubscribed" ? (
            <ConfirmAction
              trigger="Désabonner"
              title="Désabonner cette adresse ?"
              description="Elle cesse de recevoir les campagnes. Les courriels liés à ses devis continuent de lui parvenir."
              confirmLabel="Désabonner"
              endpoint={`/api/admin/newsletter/subscribers/${row.id}`}
              method="PATCH"
              body={{ status: "unsubscribed" }}
              variant="ghost"
              size="sm"
            />
          ) : null}
          <ConfirmAction
            trigger="Supprimer"
            title="Supprimer définitivement ?"
            description="La trace du consentement et du refus disparaît. À réserver aux demandes d'effacement."
            confirmLabel="Supprimer définitivement"
            endpoint={`/api/admin/newsletter/subscribers/${row.id}`}
            variant="ghost"
            size="sm"
          />
        </span>
      ),
    },
  ];

  const exportHref = `/api/admin/newsletter/subscribers/export${params.toString() ? `?${params}` : ""}`;

  return (
    <>
      <AdminPageHeader
        group="Marketing"
        title="Abonnés"
        description={`${total} abonné${total > 1 ? "s" : ""} correspondant aux filtres — ${activeCount} actif${activeCount > 1 ? "s" : ""} au total.`}
        actions={
          <>
            <Button asChild variant="secondary">
              <a href={exportHref}>Exporter en CSV</a>
            </Button>
            <Button asChild>
              <Link href="/admin/newsletter/campagnes/new">Nouvelle campagne</Link>
            </Button>
          </>
        }
      />

      <AdminFilters action={BASE} query={readParam(params, "q")} searchLabel="Rechercher" placeholder="Courriel, nom…">
        <AdminSelect
          name="status"
          label="Statut"
          value={readParam(params, "status")}
          options={subscriberStatuses.map((value) => ({ value, label: subscriberStatusLabels[value].fr }))}
        />
        <AdminSelect
          name="source"
          label="Source"
          value={readParam(params, "source")}
          options={subscriberSources.map((value) => ({ value, label: subscriberSourceLabels[value].fr }))}
        />
        <AdminSelect
          name="locale"
          label="Langue"
          value={readParam(params, "locale")}
          options={[
            { value: "fr", label: "Français" },
            { value: "en", label: "Anglais" },
          ]}
        />
      </AdminFilters>

      <AddSubscriber />

      <AdminTable
        columns={columns}
        rows={rows}
        empty={{
          title: "Aucun abonné",
          description: "Les inscriptions faites depuis le site apparaîtront ici.",
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
