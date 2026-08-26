import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalEmpty, PortalHeader, PortalPanel, StatusPill } from "@/components/portal/PortalPage";
import { Button } from "@/components/ui/button";
import { getRecentPosts } from "@/lib/content";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { displayName } from "@/lib/platform/client";
import { labelOf, quoteStatusLabels } from "@/lib/platform/enums";
import { formatDate } from "@/lib/platform/format";
import { requirePortal } from "@/lib/platform/portal";
import {
  listClientConversations,
  listClientDownloads,
  listClientQuotes,
  listNotifications,
  listVisibleResources,
} from "@/lib/platform/queries";
import { href } from "@/lib/routes";

/**
 * Vue d'ensemble de l'espace client.
 *
 * Tout ce qui s'affiche ici vient de la base et appartient au compte connecté.
 * Aucun compteur décoratif : une section sans donnée affiche un état vide avec
 * l'action correspondante, ce qui apprend au client ce qu'il peut faire.
 */
export default async function PortalOverview({ params }: PageProps<"/[locale]/espace-client">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);
  const t = dict.platform;
  const userId = portal.session.user.id;

  const [quotes, conversations, notifications, posts, resources, downloads] = await Promise.all([
    listClientQuotes(userId, { limit: 5 }),
    listClientConversations(userId, 4),
    listNotifications(userId, { limit: 5 }),
    getRecentPosts(3, locale),
    listVisibleResources({ locale, userId, limit: 3 }),
    listClientDownloads(userId, locale, 4),
  ]);

  const quotesHref = href("portalQuotes", locale);
  const messagesHref = href("portalMessages", locale);
  const resourcesHref = href("portalResources", locale);

  return (
    <div className="grid gap-12">
      <PortalHeader
        eyebrow={t.portal.title}
        title={`${t.portal.welcome} ${displayName(portal.profile, portal.session.user.name || portal.session.user.email)}`}
        lead={t.portal.welcomeLead}
        actions={
          <Button asChild size="sm">
            <Link href={href("portalQuoteNew", locale)}>{t.quotes.newRequest}</Link>
          </Button>
        }
      />

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="grid gap-10 lg:col-span-2">
          <PortalPanel
            title={t.portal.activeQuotes}
            action={
              quotes.items.length ? (
                <Link href={quotesHref} className="text-sm underline underline-offset-4">
                  {t.portal.viewAll}
                </Link>
              ) : null
            }
          >
            {quotes.items.length === 0 ? (
              <PortalEmpty
                title={t.quotes.emptyTitle}
                description={t.quotes.emptyBody}
                ctaLabel={t.quotes.emptyCta}
                ctaHref={href("portalQuoteNew", locale)}
              />
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {quotes.items.map((quote) => (
                  <li key={quote.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                    <Link
                      href={`${quotesHref}/${quote.id}`}
                      className="min-w-0 flex-1 truncate font-medium hover:underline"
                    >
                      <span className="font-mono text-xs text-muted-foreground">{quote.quoteNumber}</span>
                      <span className="ml-3">{quote.title}</span>
                    </Link>
                    <StatusPill label={labelOf(quoteStatusLabels, quote.status, locale)} />
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(quote.updatedAt, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PortalPanel>

          <PortalPanel
            title={t.portal.recentMessages}
            action={
              conversations.length ? (
                <Link href={messagesHref} className="text-sm underline underline-offset-4">
                  {t.portal.viewAll}
                </Link>
              ) : null
            }
          >
            {conversations.length === 0 ? (
              <PortalEmpty
                title={t.messages.emptyTitle}
                description={t.messages.emptyBody}
                ctaLabel={t.messages.emptyCta}
                ctaHref={messagesHref}
              />
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {conversations.map((conversation) => (
                  <li key={conversation.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                    <Link
                      href={`${messagesHref}/${conversation.id}`}
                      className="min-w-0 flex-1 truncate font-medium hover:underline"
                    >
                      {conversation.subject || t.messages.title}
                    </Link>
                    {conversation.unreadForClient > 0 ? (
                      <StatusPill
                        tone="default"
                        label={`${conversation.unreadForClient} ${t.messages.unread}`}
                      />
                    ) : null}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(conversation.lastMessageAt, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PortalPanel>

          <PortalPanel title={t.portal.latestArticles}>
            {posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{dict.common.empty}</p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {posts.map((post) => (
                  <li key={post.slug} className="py-3.5">
                    <Link
                      href={href("blog", locale, post.slug)}
                      className="font-medium hover:underline"
                    >
                      {post.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  </li>
                ))}
              </ul>
            )}
          </PortalPanel>
        </div>

        <div className="grid gap-10">
          <PortalPanel title={t.portal.notifications}>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.notifications.emptyBody}</p>
            ) : (
              <ul className="grid gap-3">
                {notifications.map((notification) => (
                  <li key={notification.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(notification.createdAt, locale)}
                    </p>
                    {notification.href ? (
                      <Link
                        href={notification.href}
                        className="mt-2 inline-block text-xs underline underline-offset-4"
                      >
                        {t.common.open}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </PortalPanel>

          <PortalPanel
            title={t.portal.recommended}
            action={
              resources.items.length ? (
                <Link href={resourcesHref} className="text-sm underline underline-offset-4">
                  {t.portal.viewAll}
                </Link>
              ) : null
            }
          >
            {resources.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.resources.emptyBody}</p>
            ) : (
              <ul className="grid gap-3">
                {resources.items.map((resource) => (
                  <li key={resource.id} className="rounded-lg border border-border p-3">
                    <Link
                      href={`${resourcesHref}/${resource.slug}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {resource.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {resource.categoryName || resource.type}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </PortalPanel>

          {downloads.length > 0 ? (
            <PortalPanel title={t.portal.recentDownloads}>
              <ul className="grid gap-2 text-sm">
                {downloads.map((download) => (
                  <li key={download.id} className="flex items-center justify-between gap-3">
                    <Link
                      href={`${resourcesHref}/${download.slug}`}
                      className="min-w-0 flex-1 truncate hover:underline"
                    >
                      {download.title}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(download.downloadedAt, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </PortalPanel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
