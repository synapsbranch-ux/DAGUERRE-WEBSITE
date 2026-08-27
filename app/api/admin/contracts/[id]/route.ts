import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ContractModel, ContractSignerModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { contractInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Introuvable" }, { status: 404 });

/**
 * Modification d'un contrat.
 *
 * **Seul un brouillon se modifie.** Une fois le contrat envoyé, son empreinte
 * est figée et des parties l'ont peut-être déjà lu : en changer le texte
 * produirait un document signé qui ne correspond plus à ce qui a été présenté,
 * ce qui ruinerait précisément la valeur de la piste d'audit.
 *
 * Les signataires sont remplacés en bloc. C'est sans risque tant que le contrat
 * est brouillon : aucun lien n'a encore été émis, donc aucun n'est invalidé
 * silencieusement.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = contractInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;

  if (data.source === "generated" && !data.body.trim()) {
    return NextResponse.json({ error: "Le corps du contrat est vide." }, { status: 400 });
  }
  if (data.source === "uploaded" && !data.sourceFileId) {
    return NextResponse.json({ error: "Déposez le PDF à faire signer." }, { status: 400 });
  }

  const emails = data.signers.map((signer) => signer.email.toLowerCase());
  if (new Set(emails).size !== emails.length) {
    return NextResponse.json(
      { error: "Deux signataires portent la même adresse : chacun doit avoir la sienne." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const doc = await ContractModel.findOneAndUpdate(
    { _id: id, status: "draft" },
    {
      $set: {
        title: data.title,
        source: data.source,
        body: data.body,
        sourceFileId: data.sourceFileId || null,
        clientId: data.clientId,
        quoteRequestId: data.quoteRequestId || null,
        projectId: data.projectId || null,
        message: data.message,
        locale: data.locale,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    },
    { new: true },
  ).lean();

  if (!doc) {
    const exists = await ContractModel.exists({ _id: id });
    return exists
      ? NextResponse.json(
          { error: "Un contrat envoyé n'est plus modifiable : son empreinte est figée. Annulez-le et repartez d'un nouveau." },
          { status: 409 },
        )
      : notFound();
  }

  await ContractSignerModel.deleteMany({ contractId: id });
  await ContractSignerModel.insertMany(
    data.signers.map((signer) => ({
      contractId: id,
      name: signer.name,
      email: signer.email,
      role: signer.role,
      order: signer.order,
      status: "pending",
      tokenVersion: 1,
    })),
  );

  return NextResponse.json({ id });
}

/** Suppression — réservée aux brouillons : un contrat envoyé s'annule. */
export async function DELETE(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  await connectToDatabase();
  const doc = await ContractModel.findOneAndDelete({ _id: id, status: "draft" }).lean();

  if (!doc) {
    const exists = await ContractModel.exists({ _id: id });
    return exists
      ? NextResponse.json(
          { error: "Seul un brouillon peut être supprimé. Un contrat envoyé s'annule." },
          { status: 409 },
        )
      : notFound();
  }

  await ContractSignerModel.deleteMany({ contractId: id });
  return NextResponse.json({ ok: true });
}

/**
 * Annulation d'un contrat en cours de signature.
 *
 * Les liens déjà émis cessent d'aboutir : la route de signature refuse tout
 * contrat qui n'est ni `sent` ni `partially_signed`. Les signatures déjà
 * apposées restent en base — elles ont eu lieu, et la piste d'audit ne se
 * réécrit pas.
 */
export async function POST(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  await connectToDatabase();

  const doc = await ContractModel.findOneAndUpdate(
    { _id: id, status: { $nin: ["signed", "cancelled"] } },
    { $set: { status: "cancelled", completedAt: new Date() } },
    { new: true },
  ).lean();

  if (!doc) {
    const exists = await ContractModel.exists({ _id: id });
    return exists
      ? NextResponse.json(
          { error: "Un contrat signé ou déjà annulé ne change plus d'état." },
          { status: 409 },
        )
      : notFound();
  }

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "contract_cancelled",
    entityType: "Contract",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
