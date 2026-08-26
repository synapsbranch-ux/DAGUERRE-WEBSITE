import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { tryConnectToDatabase } from "@/lib/db/client";
import {
  ContactMessageModel,
  PostModel,
  ProjectModel,
  ResearchModel,
  ServiceModel,
  SkillModel,
} from "@/lib/db/models";
import {
  ContentDownloadModel,
  ContentResourceModel,
  ConversationModel,
  NewsletterCampaignModel,
  NewsletterSubscriberModel,
  QuoteRequestModel,
} from "@/lib/db/models/platform";
import { isEmailConfigured } from "@/lib/email/provider";
import { actionableQuoteStatuses, quoteStatusLabels } from "@/lib/platform/enums";
import { accountLabel, accountsById, listClientAccounts } from "@/lib/platform/users";
import { formatDate } from "@/lib/utils";

type Counter = { label: string; href: string; total: number; detail: string };

const localized = (value: unknown) =>
  typeof value === "object" && value ? String((value as { fr?: string }).fr ?? "") : "";

const plural = (count: number, singular: string, suffix = "s") =>
  `${count} ${singular}${count > 1 ? suffix : ""}`;

/**
 * Tableau de bord.
 *
 * Il montre ce qui attend une décision — demandes de devis à traiter,
 * conversations non lues, devis acceptés à convertir — plutôt qu'un mur de
 * totaux. Chaque chiffre vient d'un `countDocuments` réel : aucune statistique
 * n'est estimée, et aucune n'est affichée si elle n'est pas mesurée.
 */
export default async function AdminHome() {
  const connected = await tryConnectToDatabase();

  if (!connected) {
    return (
      <>
        <p className="eyebrow">Administration</p>
        <h1 className="mt-2 text-4xl">Tableau de bord</h1>
        <p
          role="alert"
          className="mt-8 max-w-2xl rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          MongoDB est injoignable. Vérifiez <code>MONGODB_URI</code> puis rechargez la page : sans base,
          aucun contenu ne peut être lu ni enregistré.
        </p>
      </>
    );
  }

  const published = { status: "published" };

  const [
    posts,
    publishedPosts,
    projects,
    publishedProjects,
    services,
    publishedServices,
    research,
    publishedResearch,
    skills,
    activeSkills,
    messages,
    newMessages,
    resources,
    publishedResources,
    subscribers,
    activeSubscribers,
    quotes,
    actionableQuotes,
    acceptedQuotes,
    unreadConversations,
    downloads,
  ] = await Promise.all([
    PostModel.countDocuments(),
    PostModel.countDocuments(published),
    ProjectModel.countDocuments(),
    ProjectModel.countDocuments(published),
    ServiceModel.countDocuments(),
    ServiceModel.countDocuments(published),
    ResearchModel.countDocuments(),
    ResearchModel.countDocuments(published),
    SkillModel.countDocuments(),
    SkillModel.countDocuments({ enabled: true }),
    ContactMessageModel.countDocuments(),
    ContactMessageModel.countDocuments({ status: "new" }),
    ContentResourceModel.countDocuments(),
    ContentResourceModel.countDocuments(published),
    NewsletterSubscriberModel.countDocuments(),
    NewsletterSubscriberModel.countDocuments({ status: "active" }),
    QuoteRequestModel.countDocuments(),
    QuoteRequestModel.countDocuments({ status: { $in: [...actionableQuoteStatuses] } }),
    QuoteRequestModel.countDocuments({ status: "accepted" }),
    ConversationModel.countDocuments({ unreadForAdmin: { $gt: 0 } }),
    ContentDownloadModel.countDocuments(),
  ]);

  const [
    attentionQuotes,
    acceptedList,
    recentSubscribers,
    unreadList,
    recentDownloads,
    lastCampaign,
    recentClients,
    recentPosts,
  ] = await Promise.all([
    QuoteRequestModel.find({ status: { $in: [...actionableQuoteStatuses] } })
      .sort({ createdAt: 1 })
      .limit(6)
      .lean(),
    QuoteRequestModel.find({ status: "accepted", projectId: null }).sort({ updatedAt: -1 }).limit(5).lean(),
    NewsletterSubscriberModel.find().sort({ createdAt: -1 }).limit(5).lean(),
    ConversationModel.find({ unreadForAdmin: { $gt: 0 } }).sort({ lastMessageAt: -1 }).limit(5).lean(),
    ContentDownloadModel.find().sort({ downloadedAt: -1 }).limit(5).lean(),
    NewsletterCampaignModel.findOne({ status: { $in: ["sent", "sending"] } })
      .sort({ sentAt: -1 })
      .lean(),
    listClientAccounts({ limit: 5 }),
    PostModel.find().sort({ updatedAt: -1 }).limit(5).lean(),
  ]);

  const resourceIds = (recentDownloads as Record<string, unknown>[]).map((row) => String(row.resourceId));
  const downloadedResources = resourceIds.length
    ? ((await ContentResourceModel.find({ _id: { $in: resourceIds } })
        .select("title")
        .lean()) as Record<string, unknown>[])
    : [];
  const resourceTitles = new Map(
    downloadedResources.map((resource) => [String(resource._id), localized(resource.title)]),
  );

  const conversationClients = await accountsById(
    (unreadList as Record<string, unknown>[]).map((row) => String(row.clientId ?? "")),
  );

  const counters: Counter[] = [
    {
      label: "Devis",
      href: "/admin/devis",
      total: quotes,
      detail: `${actionableQuotes} en attente d'action`,
    },
    {
      label: "Conversations",
      href: "/admin/conversations",
      total: unreadConversations,
      detail: "non lues",
    },
    {
      label: "Abonnés",
      href: "/admin/newsletter/abonnes",
      total: subscribers,
      detail: `${activeSubscribers} actif${activeSubscribers > 1 ? "s" : ""}`,
    },
    {
      label: "Ressources",
      href: "/admin/ressources",
      total: resources,
      detail: `${publishedResources} publiée${publishedResources > 1 ? "s" : ""} · ${downloads} téléchargement${downloads > 1 ? "s" : ""}`,
    },
    { label: "Articles", href: "/admin/articles", total: posts, detail: plural(publishedPosts, "publié") },
    {
      label: "Réalisations",
      href: "/admin/projets",
      total: projects,
      detail: plural(publishedProjects, "publiée"),
    },
    { label: "Services", href: "/admin/services", total: services, detail: plural(publishedServices, "publié") },
    { label: "Recherche", href: "/admin/research", total: research, detail: plural(publishedResearch, "publié") },
    { label: "Compétences", href: "/admin/skills", total: skills, detail: plural(activeSkills, "active") },
    { label: "Messages", href: "/admin/messages", total: messages, detail: plural(newMessages, "non lu") },
  ];

  return (
    <>
      <p className="eyebrow">Administration</p>
      <h1 className="mt-2 text-4xl">Tableau de bord</h1>

      {isEmailConfigured() ? null : (
        <p
          role="status"
          className="mt-6 max-w-3xl rounded-lg border border-border bg-[var(--plate)] p-4 text-sm"
        >
          Envoi de courriel non configuré. Renseignez <code>RESEND_API_KEY</code> et{" "}
          <code>MAIL_FROM</code> : sans eux, aucune confirmation de devis, aucune notification et aucune
          infolettre ne partira, et l&apos;interface le signalera plutôt que de faire semblant.
        </p>
      )}

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {counters.map((counter) => (
          <li key={counter.label}>
            <Link
              href={counter.href}
              className="block h-full rounded-lg border border-border p-5 transition-colors hover:bg-foreground/5"
            >
              <p className="text-sm text-muted-foreground">{counter.label}</p>
              <p className="mt-2 font-heading text-4xl">{counter.total}</p>
              <p className="mt-1 text-xs text-muted-foreground">{counter.detail}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Panel title="Devis à traiter" href="/admin/devis">
          {attentionQuotes.length === 0 ? (
            <Empty>Aucune demande en attente.</Empty>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {(attentionQuotes as Record<string, unknown>[]).map((quote) => (
                <li key={String(quote._id)} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                  <Link
                    href={`/admin/devis/${quote._id}`}
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(quote.quoteNumber ?? "")}
                    </span>
                    <span className="ml-3 font-medium">{String(quote.title ?? "")}</span>
                  </Link>
                  <Badge variant="secondary">
                    {quoteStatusLabels[String(quote.status) as keyof typeof quoteStatusLabels]?.fr ??
                      String(quote.status ?? "")}
                  </Badge>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(quote.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Messages clients non lus" href="/admin/conversations">
          {unreadList.length === 0 ? (
            <Empty>Aucun message non lu.</Empty>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {(unreadList as Record<string, unknown>[]).map((conversation) => {
                const account = conversationClients.get(String(conversation.clientId ?? ""));
                return (
                  <li
                    key={String(conversation._id)}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3"
                  >
                    <Link
                      href={`/admin/conversations/${conversation._id}`}
                      className="min-w-0 flex-1 truncate hover:underline"
                    >
                      <span className="font-medium">{String(conversation.subject ?? "Conversation")}</span>
                      {account ? (
                        <span className="text-muted-foreground"> — {accountLabel(account)}</span>
                      ) : null}
                    </Link>
                    <Badge>{Number(conversation.unreadForAdmin ?? 0)}</Badge>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(conversation.lastMessageAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Devis acceptés à convertir" href="/admin/devis?status=accepted">
          {acceptedList.length === 0 ? (
            <Empty>
              {acceptedQuotes > 0
                ? "Tous les devis acceptés ont leur projet."
                : "Aucun devis accepté pour l'instant."}
            </Empty>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {(acceptedList as Record<string, unknown>[]).map((quote) => (
                <li key={String(quote._id)} className="flex items-center justify-between gap-3 py-3">
                  <Link
                    href={`/admin/devis/${quote._id}`}
                    className="min-w-0 flex-1 truncate font-medium hover:underline"
                  >
                    {String(quote.title ?? "")}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(quote.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Derniers abonnés" href="/admin/newsletter/abonnes">
          {recentSubscribers.length === 0 ? (
            <Empty>Aucun abonné pour l&apos;instant.</Empty>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {(recentSubscribers as Record<string, unknown>[]).map((subscriber) => (
                <li key={String(subscriber._id)} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0 flex-1 truncate">{String(subscriber.email ?? "")}</span>
                  <Badge variant={subscriber.status === "active" ? "default" : "outline"}>
                    {String(subscriber.status ?? "")}
                  </Badge>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(subscriber.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Derniers téléchargements" href="/admin/ressources">
          {recentDownloads.length === 0 ? (
            <Empty>Aucun téléchargement enregistré.</Empty>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {(recentDownloads as Record<string, unknown>[]).map((download) => (
                <li key={String(download._id)} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0 flex-1 truncate">
                    {resourceTitles.get(String(download.resourceId)) || "Ressource"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {download.userId ? "Compte client" : "Anonyme"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(download.downloadedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Dernière infolettre" href="/admin/newsletter/campagnes">
          {lastCampaign ? (
            <div className="rounded-lg border border-border p-4">
              <Link
                href={`/admin/newsletter/campagnes/${(lastCampaign as Record<string, unknown>)._id}`}
                className="font-medium hover:underline"
              >
                {String((lastCampaign as Record<string, unknown>).name ?? "")}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">
                {String((lastCampaign as Record<string, unknown>).subject ?? "")}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {Number((lastCampaign as Record<string, unknown>).recipientCount ?? 0)} destinataire(s) ·{" "}
                {formatDate((lastCampaign as Record<string, unknown>).sentAt)}
              </p>
            </div>
          ) : (
            <Empty>Aucune campagne envoyée.</Empty>
          )}
        </Panel>

        <Panel title="Derniers comptes clients" href="/admin/clients">
          {recentClients.items.length === 0 ? (
            <Empty>Aucun compte client.</Empty>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {recentClients.items.map((account) => (
                <li key={account.id} className="flex items-center justify-between gap-3 py-3">
                  <Link
                    href={`/admin/clients/${account.id}`}
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {accountLabel(account)}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(account.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Articles récents" href="/admin/articles">
          {recentPosts.length === 0 ? (
            <Empty>
              Aucun article.{" "}
              <Link href="/admin/articles/new" className="underline">
                Créer le premier
              </Link>
              .
            </Empty>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {(recentPosts as Record<string, unknown>[]).map((post) => (
                <li key={String(post._id)} className="flex items-center justify-between gap-3 py-3">
                  <Link
                    href={`/admin/articles/${post._id}`}
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {localized(post.title) || "Sans titre"}
                  </Link>
                  <StatusBadge status={String(post.status ?? "draft")} />
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(post.updatedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Messages de contact" href="/admin/messages">
          {newMessages === 0 ? (
            <Empty>Aucun message non lu.</Empty>
          ) : (
            <p className="text-sm">
              {plural(newMessages, "message non lu", "s non lus")} dans la boîte de contact.{" "}
              <Link href="/admin/messages" className="underline">
                Les ouvrir
              </Link>
              .
            </p>
          )}
        </Panel>
      </div>

      <p className="mt-10 max-w-3xl text-sm text-muted-foreground">
        Les contenus longs s&apos;écrivent en Markdown. Un contenu en brouillon ou archivé n&apos;est jamais
        servi publiquement : une adresse pointant vers lui renvoie une page 404. Les documents des
        clients ne sont jamais servis par une URL publique — ils passent par un contrôle de droits à
        chaque téléchargement.
      </p>
    </>
  );
}

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-2xl">{title}</h2>
        <Link href={href} className="text-sm underline underline-offset-4">
          Tout voir
        </Link>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
