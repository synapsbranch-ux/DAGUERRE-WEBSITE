import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ContractModel, ContractSignerModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { nextContractNumber } from "@/lib/platform/numbers";
import { contractInputSchema } from "@/lib/validation-platform";

/**
 * Création d'un contrat.
 *
 * Il naît **toujours** en brouillon : `status` n'appartient pas au schéma
 * d'entrée. Les signataires sont enregistrés en même temps, avec leur ordre
 * éventuel ; l'index unique `(contrat, courriel)` interdit d'inviter deux fois
 * la même adresse, ce qui produirait deux liens concurrents pour une seule
 * personne.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

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
  const session = await readSession();

  const contract = await ContractModel.create({
    contractNumber: await nextContractNumber(),
    title: data.title,
    source: data.source,
    body: data.body,
    sourceFileId: data.sourceFileId || null,
    status: "draft",
    clientId: data.clientId,
    quoteRequestId: data.quoteRequestId || null,
    projectId: data.projectId || null,
    message: data.message,
    locale: data.locale,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    createdById: session?.user.id ?? "",
  });

  await ContractSignerModel.insertMany(
    data.signers.map((signer) => ({
      contractId: contract._id,
      name: signer.name,
      email: signer.email,
      role: signer.role,
      order: signer.order,
      status: "pending",
      tokenVersion: 1,
    })),
  );

  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "contract_created",
    entityType: "Contract",
    entityId: String(contract._id),
    metadata: { signers: data.signers.length, source: data.source },
  });

  return NextResponse.json(
    { id: String(contract._id), contractNumber: contract.contractNumber },
    { status: 201 },
  );
}
