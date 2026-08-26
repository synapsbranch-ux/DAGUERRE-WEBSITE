import Link from "next/link";
import { notFound } from "next/navigation";

import { NewConversation } from "@/components/messaging/NewConversation";
import { PortalEmpty, PortalHeader, StatusPill } from "@/components/portal/PortalPage";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { conversationStatusLabels, labelOf } from "@/lib/platform/enums";
import { formatDate } from "@/lib/platform/format";
import { requirePortal } from "@/lib/platform/portal";
import { listClientConversations } from "@/lib/platform/queries";
import { href } from "@/lib/routes";

/** Boîte de réception du client. La requête ne remonte que ses conversations. */
export default async function PortalMessagesPage({
  params,
}: PageProps<"/[locale]/espace-client/messages">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);
  const t = dict.platform.messages;

  const conversations = await listClientConversations(portal.session.user.id);
  const base = href("portalMessages", locale);

  return (
    <div className="grid gap-8">
      <PortalHeader eyebrow={dict.platform.portal.title} title={t.title} lead={t.lead} />

      <NewConversation dict={dict} />

      {conversations.length === 0 ? (
        <PortalEmpty title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {conversations.map((conversation) => (
            <li key={conversation.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
              <Link
                href={`${base}/${conversation.id}`}
                className="min-w-0 flex-1 truncate font-medium hover:underline"
              >
                {conversation.subject || t.title}
              </Link>

              {conversation.unreadForClient > 0 ? (
                <StatusPill tone="default" label={`${conversation.unreadForClient} ${t.unread}`} />
              ) : null}

              <StatusPill label={labelOf(conversationStatusLabels, conversation.status, locale)} />

              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(conversation.lastMessageAt, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
