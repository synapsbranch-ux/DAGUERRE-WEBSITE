import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDatabaseError, AdminPageHeader } from "@/components/admin/AdminTable";
import { RoleControl } from "@/components/admin/RoleControl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import {
  ClientProjectModel,
  ContentDownloadModel,
  ContentResourceModel,
  ConversationModel,
  NotificationModel,
  QuoteRequestModel,
} from "@/lib/db/models/platform";
import { pickLocale, type LocalizedString } from "@/lib/db/models/shared";
import { getClientProfile } from "@/lib/platform/client";
import {
  clientProjectStatusLabels,
  conversationStatusLabels,
  quoteStatusLabels,
  roleLabels,
} from "@/lib/platform/enums";
import { findAccount } from "@/lib/platform/users";
import { formatDate } from "@/lib/utils";

/**
 * Fiche d'un client.
 *
 * Onglets shadcn/ui : vue d'ensemble, devis, projets, conversations,
 * téléchargements, activité. Chaque requête est filtrée sur ce compte — la
 * page ne peut pas afficher les données d'un autre client, même par erreur de
 * rendu.
 */
export default async function AdminClientPage({ params }: PageProps<"/admin/clients/[id]">) {
  const session = await requireAdmin();

  const { id } = await params;
  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Client" />;

  const account = await findAccount(id);
  if (!account) notFound();

  const [profile, quotes, projects, conversations, downloads, notifications] = await Promise.all([
    getClientProfile(id),
    QuoteRequestModel.find({ userId: id }).sort({ createdAt: -1 }).limit(50).lean(),
    ClientProjectModel.find({ clientId: id }).sort({ createdAt: -1 }).limit(50).lean(),
    ConversationModel.find({ clientId: id }).sort({ lastMessageAt: -1 }).limit(50).lean(),
    ContentDownloadModel.find({ userId: id }).sort({ downloadedAt: -1 }).limit(50).lean(),
    NotificationModel.find({ userId: id }).sort({ createdAt: -1 }).limit(30).lean(),
  ]);

  const downloadRows = downloads as Record<string, unknown>[];
  const resourceIds = downloadRows.map((row) => String(row.resourceId));
  const resources = resourceIds.length
    ? ((await ContentResourceModel.find({ _id: { $in: resourceIds } })
        .select("title")
        .lean()) as Record<string, unknown>[])
    : [];
  const resourceTitles = new Map(
    resources.map((resource) => [
      String(resource._id),
      pickLocale(resource.title as LocalizedString | undefined, "fr"),
    ]),
  );

  const identity = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || account.name;

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title={identity || account.email}
        description={account.email}
        actions={
          <>
            <Badge variant={account.role === "admin" ? "default" : "outline"}>
              {roleLabels[account.role].fr}
            </Badge>
            <Button asChild variant="secondary">
              <Link href="/admin/clients">Retour à la liste</Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="quotes">Devis ({quotes.length})</TabsTrigger>
          <TabsTrigger value="projects">Projets ({projects.length})</TabsTrigger>
          <TabsTrigger value="messages">Conversations ({conversations.length})</TabsTrigger>
          <TabsTrigger value="downloads">Téléchargements ({downloadRows.length})</TabsTrigger>
          <TabsTrigger value="activity">Activité</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="pt-6">
          <dl className="grid max-w-3xl gap-3 text-sm sm:grid-cols-2">
            <Entry label="Nom" value={identity} />
            <Entry label="Courriel" value={account.email} />
            <Entry label="Organisation" value={profile?.companyName} />
            <Entry label="Fonction" value={profile?.jobTitle} />
            <Entry label="Téléphone" value={profile?.phone} />
            <Entry label="Pays" value={profile?.country} />
            <Entry label="Secteur" value={profile?.industry} />
            <Entry label="Taille" value={profile?.companySize} />
            <Entry label="Site web" value={profile?.website} />
            <Entry
              label="Langue de correspondance"
              value={profile?.preferredLanguage === "en" ? "Anglais" : "Français"}
            />
            <Entry label="Compte ouvert le" value={formatDate(account.createdAt)} />
            <Entry label="Rôle" value={roleLabels[account.role].fr} />
          </dl>
          <p className="mt-6 max-w-[70ch] text-sm text-muted-foreground">
            Les identifiants de ce compte appartiennent à Logto et ne transitent jamais par ce site.
            Aucun mot de passe n&apos;est consultable ni récupérable depuis le tableau de bord ; le
            client le réinitialise lui-même depuis l&apos;écran de connexion.
          </p>

          <div className="mt-8 max-w-3xl">
            <RoleControl
              userId={account.id}
              role={account.role}
              isSelf={session.user.id === account.id}
            />
          </div>
        </TabsContent>

        <TabsContent value="quotes" className="pt-6">
          <SimpleList
            rows={(quotes as Record<string, unknown>[]).map((quote) => ({
              id: String(quote._id),
              href: `/admin/devis/${quote._id}`,
              title: `${String(quote.quoteNumber ?? "")} — ${String(quote.title ?? "")}`,
              meta:
                quoteStatusLabels[String(quote.status) as keyof typeof quoteStatusLabels]?.fr ??
                String(quote.status ?? ""),
              date: formatDate(quote.createdAt),
            }))}
            empty="Aucune demande de devis."
          />
        </TabsContent>

        <TabsContent value="projects" className="pt-6">
          <SimpleList
            rows={(projects as Record<string, unknown>[]).map((project) => ({
              id: String(project._id),
              href: `/admin/projets-clients/${project._id}`,
              title: `${String(project.projectNumber ?? "")} — ${String(project.title ?? "")}`,
              meta:
                clientProjectStatusLabels[
                  String(project.status) as keyof typeof clientProjectStatusLabels
                ]?.fr ?? String(project.status ?? ""),
              date: formatDate(project.createdAt),
            }))}
            empty="Aucun projet."
          />
        </TabsContent>

        <TabsContent value="messages" className="pt-6">
          <SimpleList
            rows={(conversations as Record<string, unknown>[]).map((conversation) => ({
              id: String(conversation._id),
              href: `/admin/conversations/${conversation._id}`,
              title: String(conversation.subject ?? "Conversation"),
              meta:
                conversationStatusLabels[
                  String(conversation.status) as keyof typeof conversationStatusLabels
                ]?.fr ?? String(conversation.status ?? ""),
              date: formatDate(conversation.lastMessageAt),
            }))}
            empty="Aucune conversation."
          />
        </TabsContent>

        <TabsContent value="downloads" className="pt-6">
          <SimpleList
            rows={downloadRows.map((row) => ({
              id: String(row._id),
              href: `/admin/ressources/${row.resourceId}`,
              title: resourceTitles.get(String(row.resourceId)) || "Ressource",
              meta: "",
              date: formatDate(row.downloadedAt),
            }))}
            empty="Aucun téléchargement."
          />
        </TabsContent>

        <TabsContent value="activity" className="pt-6">
          <SimpleList
            rows={(notifications as Record<string, unknown>[]).map((notification) => ({
              id: String(notification._id),
              href: "",
              title: String(notification.title ?? ""),
              meta: String(notification.type ?? ""),
              date: formatDate(notification.createdAt),
            }))}
            empty="Aucune activité enregistrée."
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Entry({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

function SimpleList({
  rows,
  empty,
}: {
  rows: { id: string; href: string; title: string; meta: string; date: string }[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;

  return (
    <ul className="divide-y divide-border border-y border-border">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
          {row.href ? (
            <Link href={row.href} className="min-w-0 flex-1 truncate font-medium hover:underline">
              {row.title}
            </Link>
          ) : (
            <span className="min-w-0 flex-1 truncate font-medium">{row.title}</span>
          )}
          {row.meta ? <span className="text-xs text-muted-foreground">{row.meta}</span> : null}
          <span className="shrink-0 text-xs text-muted-foreground">{row.date}</span>
        </li>
      ))}
    </ul>
  );
}
