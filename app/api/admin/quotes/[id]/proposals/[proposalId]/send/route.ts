import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { QuoteProposalModel, QuoteRequestModel } from "@/lib/db/models/platform";
import { publicUrl, sendTransactionalEmail } from "@/lib/email/service";
import { proposalSentEmail } from "@/lib/email/templates";
import { validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { formatMoney } from "@/lib/platform/money";
import { notify } from "@/lib/platform/notifications";
import { changeQuoteStatus, logQuoteActivity, quoteLocale } from "@/lib/platform/quotes";
import { formatDate } from "@/lib/platform/format";
import { href } from "@/lib/routes";

type Ctx = { params: Promise<{ id: string; proposalId: string }> };

/**
 * Transmission d'une proposition au client.
 *
 * L'envoi est une action **distincte** de l'enregistrement : on rédige, on
 * prévisualise, puis on envoie. Enregistrer une modification n'a jamais pour
 * effet de la transmettre.
 *
 * Le passage de `draft` à `sent` est conditionnel : deux clics simultanés
 * n'envoient pas deux courriels, et une proposition déjà transmise ne repart
 * pas. Les versions antérieures encore ouvertes passent en « remplacée » —
 * jamais celle qui a été acceptée, dont l'historique doit rester intact.
 */
export async function POST(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id, proposalId } = await params;
  if (!validObjectId(id) || !validObjectId(proposalId)) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await connectToDatabase();

  const quote = (await QuoteRequestModel.findById(id).lean()) as Record<string, unknown> | null;
  if (!quote) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const proposal = await QuoteProposalModel.findOneAndUpdate(
    { _id: proposalId, quoteRequestId: id, status: "draft" },
    { $set: { status: "sent", sentAt: new Date() } },
    { new: true },
  );

  if (!proposal) {
    const exists = await QuoteProposalModel.exists({ _id: proposalId, quoteRequestId: id });
    return exists
      ? NextResponse.json({ error: "Cette proposition a déjà été transmise." }, { status: 409 })
      : NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  // Les offres précédentes encore en attente ne valent plus.
  await QuoteProposalModel.updateMany(
    { quoteRequestId: id, _id: { $ne: proposalId }, status: "sent" },
    { $set: { status: "superseded" } },
  );

  const session = await readSession();
  const actor = { id: session?.user.id ?? "", email: session?.user.email ?? "", role: "admin" as const };

  await logQuoteActivity(id, "quote_sent", actor, { version: proposal.get("version") });

  // Le dossier suit : « devis transmis » depuis l'état où il se trouve.
  await changeQuoteStatus(id, "quote_sent", actor, { skipNotification: true });

  const locale = quoteLocale(quote);
  const quoteNumber = String(quote.quoteNumber ?? "");
  const clientId = String(quote.userId ?? "");
  const url = publicUrl("portalQuotes", locale, id);

  if (clientId) {
    await notify({
      userId: clientId,
      type: "new_proposal",
      title: `${quoteNumber} — ${String(proposal.get("title"))}`,
      message: formatMoney(Number(proposal.get("total")), String(proposal.get("currency")), locale),
      href: href("portalQuotes", locale, id),
    });
  }

  const validUntil = proposal.get("validUntil") as Date | null;

  await sendTransactionalEmail(
    String(quote.email ?? ""),
    proposalSentEmail(locale, {
      quoteNumber,
      proposalTitle: String(proposal.get("title")),
      total: formatMoney(Number(proposal.get("total")), String(proposal.get("currency")), locale),
      validUntil: validUntil ? formatDate(validUntil, locale) : "",
      url,
    }),
  );

  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "proposal_sent",
    entityType: "QuoteProposal",
    entityId: proposalId,
    metadata: { quoteId: id, version: proposal.get("version"), total: proposal.get("total") },
  });

  return NextResponse.json({ ok: true });
}
