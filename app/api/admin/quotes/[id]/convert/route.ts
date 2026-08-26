import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import {
  ClientProjectModel,
  ConversationModel,
  QuoteProposalModel,
  QuoteRequestModel,
} from "@/lib/db/models/platform";
import { publicUrl, sendTransactionalEmail } from "@/lib/email/service";
import { projectOpenedEmail } from "@/lib/email/templates";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { notify } from "@/lib/platform/notifications";
import { nextProjectNumber } from "@/lib/platform/numbers";
import { changeQuoteStatus, logQuoteActivity, quoteLocale } from "@/lib/platform/quotes";
import { href } from "@/lib/routes";
import { clientProjectInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Conversion d'un devis accepté en projet.
 *
 * Trois conditions, toutes vérifiées côté serveur :
 *
 * - le dossier est **accepté** — on n'ouvre pas un projet sur une offre que
 *   personne n'a validée ;
 * - il est rattaché à un compte client, faute de quoi le projet n'aurait
 *   personne à qui appartenir ;
 * - il n'a pas déjà donné lieu à un projet, ce que garantit la condition
 *   `projectId: null` portée par la mise à jour elle-même.
 */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = clientProjectInputSchema.partial().safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  await connectToDatabase();

  const quote = (await QuoteRequestModel.findById(id).lean()) as Record<string, unknown> | null;
  if (!quote) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const clientId = String(quote.userId ?? "");
  if (!clientId) {
    return NextResponse.json(
      { error: "Cette demande n'est rattachée à aucun compte client." },
      { status: 409 },
    );
  }

  if (String(quote.status) !== "accepted") {
    return NextResponse.json(
      { error: "Seul un devis accepté peut devenir un projet." },
      { status: 409 },
    );
  }

  if (quote.projectId) {
    return NextResponse.json({ error: "Un projet existe déjà pour ce dossier." }, { status: 409 });
  }

  const accepted = (await QuoteProposalModel.findOne({ quoteRequestId: id, status: "accepted" })
    .select("_id")
    .lean()) as { _id: unknown } | null;

  const project = await ClientProjectModel.create({
    projectNumber: await nextProjectNumber(),
    clientId,
    quoteRequestId: id,
    proposalId: accepted?._id ?? null,
    title: parsed.data.title || String(quote.title ?? ""),
    description: parsed.data.description || String(quote.description ?? ""),
    status: parsed.data.status || "planned",
    startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
    targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
  });

  const projectId = String(project._id);

  // Le rattachement est conditionnel : une conversion concurrente échoue ici.
  const linked = await QuoteRequestModel.findOneAndUpdate(
    { _id: id, projectId: null },
    { $set: { projectId } },
    { new: true },
  );

  if (!linked) {
    await ClientProjectModel.deleteOne({ _id: projectId });
    return NextResponse.json({ error: "Un projet vient d'être créé pour ce dossier." }, { status: 409 });
  }

  const session = await readSession();
  const actor = { id: session?.user.id ?? "", email: session?.user.email ?? "", role: "admin" as const };

  await logQuoteActivity(id, "converted_to_project", actor, { projectId });
  await changeQuoteStatus(id, "converted_to_project", actor, { skipNotification: true });

  // La conversation du devis suit le projet : l'échange continue au même endroit.
  await ConversationModel.updateMany({ quoteId: id }, { $set: { projectId } });

  const locale = quoteLocale(quote);
  const projectNumber = String(project.get("projectNumber"));

  await notify({
    userId: clientId,
    type: "project_update",
    title: `${projectNumber} — ${String(project.get("title"))}`,
    href: href("portalProjects", locale, projectId),
  });

  await sendTransactionalEmail(
    String(quote.email ?? ""),
    projectOpenedEmail(locale, {
      projectNumber,
      title: String(project.get("title")),
      url: publicUrl("portalProjects", locale, projectId),
    }),
  );

  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "project_created",
    entityType: "ClientProject",
    entityId: projectId,
    metadata: { quoteId: id, projectNumber },
  });

  return NextResponse.json({ id: projectId, projectNumber }, { status: 201 });
}
