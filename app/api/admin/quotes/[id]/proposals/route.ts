import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { QuoteProposalModel, QuoteRequestModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { isDuplicateKeyError } from "@/lib/platform/idempotency";
import { buildProposal } from "@/lib/platform/proposals";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Création d'une proposition.
 *
 * Chaque proposition porte un **numéro de version** unique par dossier : une
 * révision ne réécrit jamais celle qui a déjà été transmise, et l'index
 * unique `(quoteRequestId, version)` empêche deux brouillons concurrents de
 * revendiquer la même.
 *
 * Une proposition acceptée ferme la porte : proposer autre chose après un
 * accord se fait hors de l'outil, pas en modifiant l'accord.
 */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const built = buildProposal(json.data);
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: built.status });

  await connectToDatabase();
  const quote = await QuoteRequestModel.exists({ _id: id });
  if (!quote) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const accepted = await QuoteProposalModel.exists({ quoteRequestId: id, status: "accepted" });
  if (accepted) {
    return NextResponse.json(
      { error: "Une proposition a déjà été acceptée pour ce dossier." },
      { status: 409 },
    );
  }

  const last = (await QuoteProposalModel.findOne({ quoteRequestId: id })
    .sort({ version: -1 })
    .select("version")
    .lean()) as { version?: number } | null;

  const session = await readSession();

  try {
    const doc = await QuoteProposalModel.create({
      ...built.value,
      quoteRequestId: id,
      version: Number(last?.version ?? 0) + 1,
      status: "draft",
      createdById: session?.user.id ?? "",
    });

    await recordAudit({
      actorId: session?.user.id,
      actorEmail: session?.user.email,
      action: "proposal_created",
      entityType: "QuoteProposal",
      entityId: String(doc._id),
      metadata: { quoteId: id, version: doc.get("version"), total: doc.get("total") },
    });

    return NextResponse.json({ id: String(doc._id), version: doc.get("version") }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "Une autre version vient d'être créée. Rechargez la page." }, { status: 409 });
    }
    console.error("[devis] proposition non créée :", error);
    return NextResponse.json({ error: "L'enregistrement a échoué." }, { status: 500 });
  }
}
