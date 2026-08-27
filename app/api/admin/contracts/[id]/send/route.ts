import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { getSiteSettings } from "@/lib/content";
import { connectToDatabase } from "@/lib/db/client";
import { ContractModel, ContractSignerModel } from "@/lib/db/models/platform";
import { isEmailConfigured } from "@/lib/email/provider";
import { sendTransactionalEmail } from "@/lib/email/service";
import { absoluteLink } from "@/lib/email/layout";
import { contractToSignEmail } from "@/lib/email/templates";
import { validObjectId } from "@/lib/http";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { recordAudit } from "@/lib/platform/audit";
import { prepareContractDocument, signerToken } from "@/lib/platform/contracts";
import { href } from "@/lib/routes";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

type Doc = Record<string, unknown>;

/**
 * Envoi d'un contrat en signature.
 *
 * L'ordre compte :
 *
 * 1. **Le document présenté est produit et figé**, avec son empreinte. Tout ce
 *    qui suit s'y rattache — c'est ce qui rend la piste d'audit démontrable.
 * 2. **Le statut passe à « en attente »**, par une mise à jour conditionnelle
 *    sur `draft` : un double clic n'envoie pas deux séries d'invitations.
 * 3. **Les invitations partent**, chacune avec son lien personnel.
 *
 * Un envoi qui échoue pour un destinataire n'annule pas les autres : le contrat
 * est parti, et l'administrateur voit qui n'a pas été joint.
 */
export async function POST(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Envoi de courriel non configuré : renseignez RESEND_API_KEY et MAIL_FROM." },
      { status: 503 },
    );
  }

  await connectToDatabase();

  const contract = (await ContractModel.findById(id).lean()) as Doc | null;
  if (!contract) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (contract.status !== "draft") {
    return NextResponse.json(
      { error: `Ce contrat est déjà « ${String(contract.status)} ». Aucun second envoi n'a été déclenché.` },
      { status: 409 },
    );
  }

  const signers = (await ContractSignerModel.find({ contractId: id })
    .sort({ order: 1, createdAt: 1 })
    .lean()) as Doc[];

  if (signers.length === 0) {
    return NextResponse.json({ error: "Aucun signataire n'est rattaché." }, { status: 400 });
  }

  let prepared;
  try {
    prepared = await prepareContractDocument(contract);
  } catch (error) {
    console.error("[contrats] document non préparé :", error);
    prepared = null;
  }

  if (!prepared) {
    return NextResponse.json(
      { error: "Le document à signer n'a pas pu être préparé." },
      { status: 500 },
    );
  }

  // Réservation atomique : seul le premier appel bascule le statut.
  const claimed = await ContractModel.findOneAndUpdate(
    { _id: id, status: "draft" },
    {
      $set: {
        status: "sent",
        sentAt: new Date(),
        presentedFileId: prepared.fileId,
        documentHash: prepared.hash,
      },
    },
    { new: true },
  ).lean();

  if (!claimed) {
    return NextResponse.json({ error: "Ce contrat vient d'être envoyé par ailleurs." }, { status: 409 });
  }

  const localeValue = String(contract.locale ?? "");
  const locale: Locale = isLocale(localeValue) ? localeValue : defaultLocale;
  const site = await getSiteSettings(locale);
  const senderName = site?.brandName ?? "Daguerre";

  const failures: string[] = [];

  for (const signer of signers) {
    const token = signerToken(String(signer._id), Number(signer.tokenVersion ?? 1));
    const url = absoluteLink(`${href("contractSign", locale)}?jeton=${encodeURIComponent(token)}`);

    const outcome = await sendTransactionalEmail(
      String(signer.email ?? ""),
      contractToSignEmail(locale, {
        title: String(contract.title ?? ""),
        contractNumber: String(contract.contractNumber ?? ""),
        senderName,
        message: String(contract.message ?? ""),
        url,
      }),
    );

    if (!outcome.ok) failures.push(String(signer.email ?? ""));
  }

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "contract_sent",
    entityType: "Contract",
    entityId: id,
    metadata: { signers: signers.length, failures: failures.length },
  });

  if (failures.length > 0) {
    return NextResponse.json({
      ok: true,
      emailed: false,
      error: `Le contrat est envoyé, mais l'invitation n'est pas partie vers : ${failures.join(", ")}.`,
    });
  }

  return NextResponse.json({ ok: true, emailed: true });
}
