import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/client";
import { QuoteProposalModel, QuoteRequestModel } from "@/lib/db/models/platform";
import { adminNotificationAddress, adminUrl, sendTransactionalEmail } from "@/lib/email/service";
import { proposalDecisionAdminEmail } from "@/lib/email/templates";
import { readJson, validObjectId } from "@/lib/http";
import { isDenied, notFoundResponse, requireSessionApi } from "@/lib/platform/access";
import { changeQuoteStatus, logQuoteActivity } from "@/lib/platform/quotes";
import { proposalDecisionSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Décision du client sur la proposition en cours.
 *
 * ## Ce qui est vérifié côté serveur
 *
 * - le dossier appartient au compte connecté — la condition est dans la
 *   requête, un identifiant qui n'est pas le vôtre ne remonte rien ;
 * - la proposition visée est bien celle du dossier et son statut est `sent` ;
 * - la confirmation explicite est présente.
 *
 * ## Ce que le client ne peut pas faire
 *
 * Ni modifier un montant, ni revenir sur une décision : la bascule est
 * conditionnée à `status: "sent"`, donc une proposition déjà acceptée ne peut
 * pas être refusée ensuite, ni acceptée deux fois.
 */
export async function POST(request: Request, { params }: Ctx) {
  const guard = await requireSessionApi();
  if (isDenied(guard)) return guard.denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFoundResponse();

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = proposalDecisionSchema.safeParse(json.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirmation requise." }, { status: 400 });
  }

  const proposalId = (json.data as { proposalId?: unknown })?.proposalId;
  if (typeof proposalId !== "string" || !validObjectId(proposalId)) {
    return NextResponse.json({ error: "Proposition invalide." }, { status: 400 });
  }

  await connectToDatabase();
  const user = guard.session.user;

  const quote = (await QuoteRequestModel.findOne({ _id: id, userId: user.id }).lean()) as Record<
    string,
    unknown
  > | null;
  if (!quote) return notFoundResponse();

  const accepted = parsed.data.decision === "accept";
  const now = new Date();

  const proposal = await QuoteProposalModel.findOneAndUpdate(
    { _id: proposalId, quoteRequestId: id, status: "sent" },
    {
      $set: accepted
        ? { status: "accepted", acceptedAt: now, acceptedBy: user.id }
        : { status: "declined", declinedAt: now, declineReason: parsed.data.reason },
    },
    { new: true },
  );

  if (!proposal) {
    return NextResponse.json(
      { error: "Cette proposition n'est plus en attente de décision." },
      { status: 409 },
    );
  }

  const actor = { id: user.id, email: user.email, role: "customer" as const };
  await logQuoteActivity(id, accepted ? "client_accepted" : "client_declined", actor, {
    version: proposal.get("version"),
  });

  await changeQuoteStatus(id, accepted ? "accepted" : "declined", actor, { skipNotification: true });

  const alert = adminNotificationAddress();
  if (alert) {
    await sendTransactionalEmail(
      alert,
      proposalDecisionAdminEmail("fr", {
        quoteNumber: String(quote.quoteNumber ?? ""),
        accepted,
        clientName: `${String(quote.firstName ?? "")} ${String(quote.lastName ?? "")}`.trim() || user.email,
        url: adminUrl(`/admin/devis/${id}`),
      }),
    );
  }

  return NextResponse.json({ ok: true, decision: parsed.data.decision });
}
