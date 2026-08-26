import Link from "next/link";
import { notFound } from "next/navigation";

import { MessageComposer } from "@/components/messaging/MessageComposer";
import { MessageThread } from "@/components/messaging/MessageThread";
import { PortalHeader } from "@/components/portal/PortalPage";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { validObjectId } from "@/lib/http";
import { markConversationRead } from "@/lib/platform/messaging";
import { requirePortal } from "@/lib/platform/portal";
import { findClientConversation, listMessages } from "@/lib/platform/queries";
import { href } from "@/lib/routes";

/**
 * Fil d'une conversation.
 *
 * `findClientConversation` porte l'appartenance dans la requête : une
 * conversation qui n'est pas la vôtre ne remonte pas, et la page rend 404.
 */
export default async function PortalConversationPage({
  params,
}: PageProps<"/[locale]/espace-client/messages/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !validObjectId(id)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);
  const t = dict.platform.messages;

  const conversation = await findClientConversation(portal.session.user.id, id);
  if (!conversation) notFound();

  const messages = await listMessages(id);
  if (conversation.unreadForClient > 0) await markConversationRead(id, "client");

  const closed = conversation.status !== "open";

  return (
    <div className="grid gap-8">
      <PortalHeader
        eyebrow={dict.platform.portal.title}
        title={conversation.subject || t.title}
        lead={
          conversation.quoteId
            ? t.linkedQuote
            : conversation.projectId
              ? t.linkedProject
              : undefined
        }
      />

      {conversation.quoteId ? (
        <Link
          href={href("portalQuotes", locale, conversation.quoteId)}
          className="w-fit text-sm underline underline-offset-4"
        >
          {t.linkedQuote}
        </Link>
      ) : null}

      {conversation.projectId ? (
        <Link
          href={href("portalProjects", locale, conversation.projectId)}
          className="w-fit text-sm underline underline-offset-4"
        >
          {t.linkedProject}
        </Link>
      ) : null}

      <MessageThread
        messages={messages}
        locale={locale}
        viewerRole="client"
        emptyLabel={t.emptyBody}
      />

      <MessageComposer
        endpoint={`/api/client/conversations/${id}/messages`}
        label={t.message}
        sendLabel={t.send}
        sendingLabel={dict.platform.common.sending}
        errorLabel={dict.platform.common.error}
        disabled={closed}
        disabledLabel={t.closed}
      />

      <Link href={href("portalMessages", locale)} className="text-sm underline underline-offset-4">
        {t.title}
      </Link>
    </div>
  );
}
