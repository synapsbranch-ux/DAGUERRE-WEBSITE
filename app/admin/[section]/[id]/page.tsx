import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResourceForm } from "@/components/admin/forms/ResourceForm";
import { MessageActions } from "@/components/admin/MessageActions";
import { requireAdmin } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { adminResources } from "@/lib/admin-content";
import { findSection } from "@/lib/admin-sections";
import { ContactMessageModel } from "@/lib/db/models";
import { isValidObjectId } from "mongoose";
import { messageStatusLabels, type MessageStatus } from "@/lib/messages";
import { formatDate } from "@/lib/utils";

export default async function EditContent({ params }: PageProps<"/admin/[section]/[id]">) {
  await requireAdmin();
  const { section, id } = await params;

  const item = findSection(section);
  if (!item || !isValidObjectId(id)) notFound();

  await connectToDatabase();

  if (item.kind === "messages") return <MessageDetail id={id} />;
  if (item.kind !== "collection") notFound();

  const doc = await adminResources[item.resource].model.findById(id).lean();
  if (!doc) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">{item.label}</p>
          <h1 className="mt-2 text-4xl">Modifier</h1>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/admin/${section}`}>Retour à la liste</Link>
        </Button>
      </div>

      <div className="mt-8">
        {/* `lean()` renvoie des ObjectId et des Date : ce passage par JSON les
            transforme en chaînes sérialisables pour le composant client. */}
        <ResourceForm resource={item.resource} id={id} initial={JSON.parse(JSON.stringify(doc))} />
      </div>
    </>
  );
}

async function MessageDetail({ id }: { id: string }) {
  const message = await ContactMessageModel.findById(id).lean();
  if (!message) notFound();

  const status = String(message.status ?? "new") as MessageStatus;
  const email = String(message.email);
  const subject = String(message.subject || "sans objet");
  const body = String(message.message);

  /** Réponse pré-remplie : objet repris et message d'origine cité. */
  const mailto = `mailto:${email}?subject=${encodeURIComponent(`Re : ${subject}`)}&body=${encodeURIComponent(
    `\n\n— Message reçu le ${formatDate(message.createdAt)} —\n${body.replace(/^/gm, "> ")}\n`,
  )}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Message</p>
          <h1 className="mt-2 text-4xl">{subject}</h1>
        </div>
        <Button asChild variant="secondary">
          <Link href="/admin/messages">Retour aux messages</Link>
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Badge variant={status === "new" ? "default" : "outline"}>{messageStatusLabels[status] ?? status}</Badge>
        <span className="text-sm text-muted-foreground">Reçu le {formatDate(message.createdAt)}</span>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Expéditeur</dt>
          <dd>{String(message.name)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Courriel</dt>
          <dd>
            <a className="underline" href={`mailto:${email}`}>
              {email}
            </a>
          </dd>
        </div>
        {message.organisation ? (
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Organisation</dt>
            <dd>{String(message.organisation)}</dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-8 max-w-3xl border-t border-border pt-6 whitespace-pre-wrap">{body}</p>

      <MessageActions id={String(message._id)} status={status} mailto={mailto} />
    </>
  );
}
