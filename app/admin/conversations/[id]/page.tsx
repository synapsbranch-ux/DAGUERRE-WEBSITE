import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDatabaseError, AdminPageHeader } from "@/components/admin/AdminTable";
import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { MessageComposer } from "@/components/messaging/MessageComposer";
import { MessageThread } from "@/components/messaging/MessageThread";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { ConversationModel } from "@/lib/db/models/platform";
import { validObjectId } from "@/lib/http";
import { conversationStatusLabels } from "@/lib/platform/enums";
import { markConversationRead } from "@/lib/platform/messaging";
import { listMessages, toConversationSummary } from "@/lib/platform/queries";
import { accountLabel, findAccount } from "@/lib/platform/users";
import { formatDate } from "@/lib/utils";

/**
 * Fil d'une conversation, côté administration.
 *
 * Ouvrir la page vaut lecture : le compteur de non-lus retombe, sans quoi la
 * boîte de réception signalerait éternellement des messages déjà traités.
 */
export default async function AdminConversationPage({
  params,
}: PageProps<"/admin/conversations/[id]">) {
  await requireAdmin();

  const { id } = await params;
  if (!validObjectId(id)) notFound();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Conversation" />;

  const doc = (await ConversationModel.findById(id).lean()) as Record<string, unknown> | null;
  if (!doc) notFound();

  const conversation = toConversationSummary(doc);
  const [messages, account] = await Promise.all([
    listMessages(id),
    findAccount(conversation.clientId),
  ]);

  if (conversation.unreadForAdmin > 0) await markConversationRead(id, "admin");

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title={conversation.subject || "Conversation"}
        description={account ? accountLabel(account) : undefined}
        actions={
          <>
            <Badge variant={conversation.status === "open" ? "secondary" : "outline"}>
              {conversationStatusLabels[
                conversation.status as keyof typeof conversationStatusLabels
              ]?.fr ?? conversation.status}
            </Badge>

            {conversation.status === "open" ? (
              <ConfirmAction
                trigger="Fermer"
                title="Fermer cette conversation ?"
                description="Le fil reste lisible par le client ; il cesse seulement d'attendre une réponse."
                confirmLabel="Fermer"
                endpoint={`/api/admin/conversations/${id}`}
                method="PATCH"
                body={{ status: "closed" }}
                variant="secondary"
              />
            ) : (
              <ConfirmAction
                trigger="Rouvrir"
                title="Rouvrir cette conversation ?"
                description="Le client pourra de nouveau y répondre."
                confirmLabel="Rouvrir"
                endpoint={`/api/admin/conversations/${id}`}
                method="PATCH"
                body={{ status: "open" }}
                variant="secondary"
              />
            )}

            <Button asChild variant="ghost">
              <Link href="/admin/conversations">Retour</Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>Dernier message : {formatDate(conversation.lastMessageAt)}</span>
        {conversation.quoteId ? (
          <Link href={`/admin/devis/${conversation.quoteId}`} className="underline underline-offset-4">
            Dossier de devis lié
          </Link>
        ) : null}
        {conversation.projectId ? (
          <Link
            href={`/admin/projets-clients/${conversation.projectId}`}
            className="underline underline-offset-4"
          >
            Projet lié
          </Link>
        ) : null}
        {account ? (
          <Link href={`/admin/clients/${account.id}`} className="underline underline-offset-4">
            Fiche client
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid max-w-4xl gap-8">
        <MessageThread
          messages={messages}
          locale="fr"
          viewerRole="admin"
          emptyLabel="Aucun message."
        />

        <MessageComposer
          endpoint={`/api/admin/conversations/${id}/messages`}
          label="Répondre au client"
          sendLabel="Envoyer"
          sendingLabel="Envoi…"
          errorLabel="Le message n'a pas pu être envoyé."
          disabled={conversation.status === "archived"}
          disabledLabel="Cette conversation est archivée."
        />
      </div>
    </>
  );
}
