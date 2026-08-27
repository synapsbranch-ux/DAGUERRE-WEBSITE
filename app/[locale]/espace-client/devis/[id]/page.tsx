import Link from "next/link";
import { notFound } from "next/navigation";

import { MessageComposer } from "@/components/messaging/MessageComposer";
import { MessageThread } from "@/components/messaging/MessageThread";
import { PortalHeader, PortalPanel, StatusPill } from "@/components/portal/PortalPage";
import { ProposalDecision } from "@/components/quotes/ProposalDecision";
import { ProposalView } from "@/components/quotes/ProposalView";
import { QuoteTimeline } from "@/components/quotes/QuoteTimeline";
import { QuoteRequestModel } from "@/lib/db/models/platform";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale, type Locale } from "@/lib/i18n";
import { validObjectId } from "@/lib/http";
import { labelOf, quoteStatusLabels } from "@/lib/platform/enums";
import { formatBytes, formatDate } from "@/lib/platform/format";
import { markConversationRead } from "@/lib/platform/messaging";
import { requirePortal } from "@/lib/platform/portal";
import {
  findClientQuote,
  listClientProposals,
  listMessages,
  listQuoteActivity,
  listQuoteFiles,
} from "@/lib/platform/queries";
import { ConversationModel } from "@/lib/db/models/platform";
import { href } from "@/lib/routes";

/**
 * Suivi détaillé d'une demande.
 *
 * Tout ce qui s'affiche ici a passé une condition d'appartenance **dans la
 * requête** : `findClientQuote` ne rend rien si le dossier n'est pas celui du
 * compte connecté, et la page répond alors 404. Deviner un identifiant ne
 * donne donc accès à rien.
 *
 * Trois choses n'y figurent jamais : les notes internes, les activités
 * internes, et les propositions encore en brouillon.
 */
export default async function PortalQuoteDetailPage({
  params,
}: PageProps<"/[locale]/espace-client/devis/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !validObjectId(id)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);
  const t = dict.platform.quotes;
  const userId = portal.session.user.id;

  const quote = await findClientQuote(userId, id);
  if (!quote) notFound();

  const [activities, proposals, files, conversation] = await Promise.all([
    listQuoteActivity(id),
    listClientProposals(id),
    listQuoteFiles(id),
    ConversationModel.findOne({ quoteId: id, clientId: userId }).lean() as Promise<Record<
      string,
      unknown
    > | null>,
  ]);

  const conversationId = conversation ? String(conversation._id) : "";
  const messages = conversationId ? await listMessages(conversationId) : [];

  // La consultation vaut lecture : le compteur de non-lus retombe à zéro.
  if (conversationId && Number(conversation?.unreadForClient ?? 0) > 0) {
    await markConversationRead(conversationId, "customer");
  }

  // Le premier affichage par le client est daté, pour l'administration.
  if (!quote.status.startsWith("cancel")) {
    await QuoteRequestModel.updateOne(
      { _id: id, userId, clientViewedAt: null },
      { $set: { clientViewedAt: new Date() } },
    );
  }

  const pending = proposals.find((proposal) => proposal.status === "sent");
  const details: { label: string; value: string }[] = [
    { label: t.fields.description, value: quote.description },
    { label: t.fields.businessObjective, value: quote.businessObjective },
    { label: t.fields.dataSources, value: quote.dataSources },
    { label: t.fields.volume, value: quote.estimatedDataVolume },
    { label: t.fields.deliverables, value: quote.desiredDeliverables },
    { label: t.fields.budget, value: quote.budgetRange },
    { label: t.fields.startDate, value: quote.desiredStartDate ? formatDate(quote.desiredStartDate, locale) : "" },
    { label: t.fields.deadline, value: quote.deadline ? formatDate(quote.deadline, locale) : "" },
  ].filter((row) => row.value);

  return (
    <div className="grid gap-10">
      <PortalHeader
        eyebrow={quote.quoteNumber}
        title={quote.title}
        lead={`${t.submitted} ${formatDate(quote.createdAt, locale)}`}
        actions={<StatusPill label={labelOf(quoteStatusLabels, quote.status, locale)} tone="default" />}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-10">
          {pending ? (
            <PortalPanel title={t.proposal}>
              <div className="grid gap-5">
                <ProposalView proposal={pending} dict={dict} locale={locale} />
                <ProposalDecision dict={dict} quoteId={id} proposalId={pending.id} />
                <PrintLink locale={locale} quoteId={id} label={t.printProposal} />
              </div>
            </PortalPanel>
          ) : proposals.length > 0 ? (
            <PortalPanel title={t.proposal}>
              <div className="grid gap-5">
                {proposals.map((proposal) => (
                  <ProposalView key={proposal.id} proposal={proposal} dict={dict} locale={locale} />
                ))}
                <PrintLink locale={locale} quoteId={id} label={t.printProposal} />
              </div>
            </PortalPanel>
          ) : (
            <PortalPanel title={t.proposal}>
              <p className="text-sm text-muted-foreground">{t.noProposal}</p>
            </PortalPanel>
          )}

          <PortalPanel title={t.request}>
            <dl className="grid gap-4 rounded-lg border border-border p-5 text-sm">
              {details.map((row) => (
                <div key={row.label} className="grid gap-1 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="whitespace-pre-line">{row.value}</dd>
                </div>
              ))}
            </dl>
          </PortalPanel>

          <PortalPanel title={t.conversation}>
            <div className="grid gap-6">
              <MessageThread
                messages={messages}
                locale={locale}
                viewerRole="customer"
                emptyLabel={dict.platform.messages.emptyBody}
              />

              {conversationId ? (
                <MessageComposer
                  endpoint={`/api/client/conversations/${conversationId}/messages`}
                  uploadEndpoint={`/api/client/conversations/${conversationId}/files`}
                  label={dict.platform.messages.message}
                  attachLabel={dict.platform.messages.attach}
                  sendLabel={dict.platform.messages.send}
                  sendingLabel={dict.platform.common.sending}
                  errorLabel={dict.platform.common.error}
                />
              ) : null}
            </div>
          </PortalPanel>
        </div>

        <aside className="grid gap-10">
          <PortalPanel title={t.timeline}>
            <QuoteTimeline
              activities={activities}
              locale={locale}
              emptyLabel={dict.platform.common.loading}
            />
          </PortalPanel>

          <PortalPanel title={t.files}>
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

          <Link href={href("portalQuotes", locale)} className="text-sm underline underline-offset-4">
            {t.myQuotes}
          </Link>
        </aside>
      </div>
    </div>
  );
}

/** Lien vers la version imprimable, d'où le navigateur produit le PDF. */
function PrintLink({ locale, quoteId, label }: { locale: Locale; quoteId: string; label: string }) {
  return (
    <Link
      href={`${href("portalQuotes", locale, quoteId)}/imprimer`}
      className="text-sm underline underline-offset-4"
    >
      {label}
    </Link>
  );
}
