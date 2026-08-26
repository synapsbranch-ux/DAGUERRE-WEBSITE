import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDatabaseError, AdminPageHeader } from "@/components/admin/AdminTable";
import { ProposalBuilder, emptyProposal, toDraft } from "@/components/admin/ProposalBuilder";
import { QuoteDocuments } from "@/components/admin/QuoteDocuments";
import { QuoteNotes, type QuoteNote } from "@/components/admin/QuoteNotes";
import { QuoteStatusControl } from "@/components/admin/QuoteStatusControl";
import { ConvertToProject } from "@/components/admin/ConvertToProject";
import { MessageComposer } from "@/components/messaging/MessageComposer";
import { MessageThread } from "@/components/messaging/MessageThread";
import { ProposalView } from "@/components/quotes/ProposalView";
import { QuoteTimeline } from "@/components/quotes/QuoteTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import {
  ConversationModel,
  QuoteNoteModel,
  QuoteRequestModel,
} from "@/lib/db/models/platform";
import { getDictionaryFor } from "@/lib/dictionaries";
import { validObjectId } from "@/lib/http";
import { labelOf, quoteStatusLabels, type QuoteStatus } from "@/lib/platform/enums";
import { formatBytes, formatDate } from "@/lib/platform/format";
import { markConversationRead } from "@/lib/platform/messaging";
import {
  listAdminProposals,
  listMessages,
  listQuoteActivity,
  listQuoteFiles,
  toQuoteDetail,
} from "@/lib/platform/queries";
import { href } from "@/lib/routes";
import { formatDate as formatAdminDate } from "@/lib/utils";

/**
 * Poste de travail d'un dossier.
 *
 * Tout ce qu'il faut pour traiter une demande sans changer d'écran : le
 * client, la demande, le statut, les notes internes, la conversation visible
 * du client, les documents, le constructeur de devis et l'historique.
 *
 * La frontière entre **note interne** et **message client** est structurelle :
 * deux collections, deux points d'entrée, deux composants. Rien ne dépend d'un
 * style ou d'une condition d'affichage.
 */
export default async function AdminQuoteDetailPage({ params }: PageProps<"/admin/devis/[id]">) {
  await requireAdmin();

  const { id } = await params;
  if (!validObjectId(id)) notFound();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Devis" />;

  const doc = (await QuoteRequestModel.findById(id).lean()) as Record<string, unknown> | null;
  if (!doc) notFound();

  const quote = toQuoteDetail(doc);
  const dict = await getDictionaryFor("fr");

  const [activities, proposals, files, noteDocs, conversation] = await Promise.all([
    listQuoteActivity(id, true),
    listAdminProposals(id),
    listQuoteFiles(id),
    QuoteNoteModel.find({ quoteId: id }).sort({ createdAt: -1 }).limit(100).lean(),
    ConversationModel.findOne({ quoteId: id }).lean() as Promise<Record<string, unknown> | null>,
  ]);

  const conversationId = conversation ? String(conversation._id) : "";
  const messages = conversationId ? await listMessages(conversationId) : [];

  if (conversationId && Number(conversation?.unreadForAdmin ?? 0) > 0) {
    await markConversationRead(conversationId, "admin");
  }

  // Première ouverture par l'administration : datée pour mesurer le délai.
  await QuoteRequestModel.updateOne({ _id: id, adminViewedAt: null }, { $set: { adminViewedAt: new Date() } });

  const notes: QuoteNote[] = (noteDocs as Record<string, unknown>[]).map((note) => ({
    id: String(note._id),
    authorName: String(note.authorName ?? ""),
    body: String(note.body ?? ""),
    createdAt: formatAdminDate(note.createdAt),
  }));

  const draft = proposals.find((proposal) => proposal.status === "draft");
  const accepted = proposals.find((proposal) => proposal.status === "accepted");

  const details: { label: string; value: string }[] = [
    { label: "Description", value: quote.description },
    { label: "Objectif d'affaires", value: quote.businessObjective },
    { label: "Sources de données", value: quote.dataSources },
    { label: "Volume estimé", value: quote.estimatedDataVolume },
    { label: "Livrables attendus", value: quote.desiredDeliverables },
    { label: "Enveloppe budgétaire", value: quote.budgetRange },
    { label: "Début souhaité", value: quote.desiredStartDate ? formatAdminDate(quote.desiredStartDate) : "" },
    { label: "Échéance", value: quote.deadline ? formatAdminDate(quote.deadline) : "" },
  ].filter((row) => row.value);

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title={quote.title}
        description={`${quote.quoteNumber} · soumis le ${formatAdminDate(quote.createdAt)}`}
        actions={
          <>
            <Badge variant="default">{labelOf(quoteStatusLabels, quote.status, "fr")}</Badge>
            <Button asChild variant="secondary">
              <Link href="/admin/devis">Retour à la file</Link>
            </Button>
          </>
        }
      />

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-8">
          <section className="grid gap-4 rounded-lg border border-border p-5">
            <h2 className="font-heading text-lg">Client</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <Field label="Nom" value={`${quote.firstName} ${quote.lastName}`.trim()} />
              <Field label="Courriel" value={quote.email} href={`mailto:${quote.email}`} />
              {quote.companyName ? <Field label="Organisation" value={quote.companyName} /> : null}
              {quote.phone ? <Field label="Téléphone" value={quote.phone} href={`tel:${quote.phone}`} /> : null}
              <Field
                label="Compte client"
                value={quote.userId ? "Rattaché" : "Aucun — demande anonyme"}
                href={quote.userId ? `/admin/clients/${quote.userId}` : undefined}
              />
              <Field
                label="Langue"
                value={quote.locale === "en" ? "Anglais" : "Français"}
              />
            </dl>
          </section>

          <section className="grid gap-4 rounded-lg border border-border p-5">
            <h2 className="font-heading text-lg">Demande</h2>
            <dl className="grid gap-4 text-sm">
              {details.map((row) => (
                <div key={row.label} className="grid gap-1 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="whitespace-pre-line">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <ProposalBuilder
            quoteId={id}
            initial={draft ? toDraft(draft) : emptyProposal}
            disabledReason={
              accepted
                ? `Le devis v${accepted.version} a été accepté le ${formatAdminDate(accepted.acceptedAt)}. Une proposition acceptée ne se remplace pas.`
                : undefined
            }
          />

          {proposals.filter((proposal) => proposal.status !== "draft").length > 0 ? (
            <section className="grid gap-4">
              <h2 className="font-heading text-lg">Versions transmises</h2>
              {proposals
                .filter((proposal) => proposal.status !== "draft")
                .map((proposal) => (
                  <ProposalView key={proposal.id} proposal={proposal} dict={dict} locale="fr" />
                ))}
            </section>
          ) : null}

          <section className="grid gap-4 rounded-lg border border-border p-5">
            <div>
              <h2 className="font-heading text-lg">Conversation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Visible du client. Pour une remarque interne, utilisez les notes.
              </p>
            </div>

            <MessageThread
              messages={messages}
              locale="fr"
              viewerRole="admin"
              emptyLabel="Aucun échange pour l'instant."
            />

            {conversationId ? (
              <MessageComposer
                endpoint={`/api/admin/conversations/${conversationId}/messages`}
                label="Répondre au client"
                sendLabel="Envoyer"
                sendingLabel="Envoi…"
                errorLabel="Le message n'a pas pu être envoyé."
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Cette demande n&apos;est rattachée à aucun compte : la conversation s&apos;ouvrira dès que le
                client aura réclamé son dossier.
              </p>
            )}
          </section>
        </div>

        <aside className="grid gap-8">
          <QuoteStatusControl
            quoteId={id}
            status={quote.status as QuoteStatus}
            priority={quote.priority}
            canMessage={Boolean(quote.userId)}
          />

          {quote.status === "accepted" && !quote.projectId ? (
            <ConvertToProject quoteId={id} quoteNumber={quote.quoteNumber} title={quote.title} />
          ) : null}

          {quote.projectId ? (
            <section className="rounded-lg border border-border p-5">
              <h2 className="font-heading text-lg">Projet</h2>
              <Link
                href={`/admin/projets-clients/${quote.projectId}`}
                className="mt-2 inline-block text-sm underline underline-offset-4"
              >
                Ouvrir le projet lié
              </Link>
            </section>
          ) : null}

          <QuoteNotes quoteId={id} notes={notes} />

          <QuoteDocuments
            quoteId={id}
            ownerUserId={quote.userId}
            documents={files.map((file) => ({
              id: file.id,
              filename: file.filename,
              size: formatBytes(file.size, "fr"),
              createdAt: formatDate(file.createdAt, "fr"),
            }))}
          />

          <section className="rounded-lg border border-border p-5">
            <h2 className="font-heading text-lg">Historique</h2>
            <div className="mt-4">
              <QuoteTimeline activities={activities} locale="fr" emptyLabel="Aucun événement." />
            </div>
          </section>

          <p className="text-xs text-muted-foreground">
            Suivi : {href("portalQuotes", quote.locale, id)}
          </p>
        </aside>
      </div>
    </>
  );
}

function Field({ label, value, href: link }: { label: string; value: string; href?: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>
        {link ? (
          <Link href={link} className="underline underline-offset-4">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
