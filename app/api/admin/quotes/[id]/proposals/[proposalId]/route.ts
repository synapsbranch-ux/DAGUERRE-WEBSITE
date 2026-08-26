import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { QuoteProposalModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { buildProposal } from "@/lib/platform/proposals";

type Ctx = { params: Promise<{ id: string; proposalId: string }> };

/**
 * Modification d'une proposition.
 *
 * **Seul un brouillon se modifie.** Une proposition transmise a été lue par le
 * client, parfois imprimée ; la réécrire produirait un document qui ne
 * correspond plus à ce qu'il a reçu. Pour changer une offre déjà envoyée, on
 * crée une nouvelle version.
 *
 * La condition est portée par la requête de mise à jour elle-même, pas par un
 * `if` préalable : deux enregistrements concurrents ne peuvent pas se glisser
 * entre la lecture et l'écriture.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id, proposalId } = await params;
  if (!validObjectId(id) || !validObjectId(proposalId)) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const built = buildProposal(json.data);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: built.status });

  await connectToDatabase();

  const doc = await QuoteProposalModel.findOneAndUpdate(
    { _id: proposalId, quoteRequestId: id, status: "draft" },
    { $set: built.value },
    { new: true },
  );

  if (!doc) {
    const exists = await QuoteProposalModel.exists({ _id: proposalId, quoteRequestId: id });
    return exists
      ? NextResponse.json(
          { error: "Une proposition déjà transmise ne se modifie pas. Créez une nouvelle version." },
          { status: 409 },
        )
      : NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "proposal_updated",
    entityType: "QuoteProposal",
    entityId: proposalId,
    metadata: { quoteId: id, total: doc.get("total") },
  });

  return NextResponse.json({ ok: true });
}

/** Suppression d'un brouillon — une proposition transmise reste au dossier. */
export async function DELETE(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id, proposalId } = await params;
  if (!validObjectId(id) || !validObjectId(proposalId)) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await connectToDatabase();
  const doc = await QuoteProposalModel.findOneAndDelete({
    _id: proposalId,
    quoteRequestId: id,
    status: "draft",
  }).lean();

  if (!doc) {
    return NextResponse.json(
      { error: "Seul un brouillon peut être supprimé." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
