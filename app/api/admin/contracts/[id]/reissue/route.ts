import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { getSiteSettings } from "@/lib/content";
import { connectToDatabase } from "@/lib/db/client";
import { ContractModel, ContractSignerModel } from "@/lib/db/models/platform";
import { absoluteLink } from "@/lib/email/layout";
import { isEmailConfigured } from "@/lib/email/provider";
import { sendTransactionalEmail } from "@/lib/email/service";
import { contractToSignEmail } from "@/lib/email/templates";
import { validObjectId } from "@/lib/http";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { recordAudit } from "@/lib/platform/audit";
import { signerToken } from "@/lib/platform/contracts";
import { href } from "@/lib/routes";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

type Doc = Record<string, unknown>;

/**
 * Réémission des liens de signature.
 *
 * Deux besoins que rien d'autre ne couvre : relancer une partie qui n'a pas
 * signé, et **révoquer un lien parti à la mauvaise adresse**.
 *
 * L'incrément de `tokenVersion` traite les deux d'un coup : le sujet du jeton
 * porte la version, donc tout lien déjà envoyé cesse d'aboutir à la seconde
 * même. Il n'y a pas de table de jetons à purger, et pas de fenêtre pendant
 * laquelle l'ancien et le nouveau fonctionneraient tous les deux.
 *
 * Seules les parties qui n'ont pas encore agi sont concernées : réémettre le
 * lien de quelqu'un qui a signé n'aurait aucun sens et rouvrirait un document
 * qu'il a déjà arrêté.
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

  if (!["sent", "partially_signed"].includes(String(contract.status))) {
    return NextResponse.json(
      { error: "Seul un contrat en cours de signature peut voir ses liens réémis." },
      { status: 409 },
    );
  }

  // La révocation d'abord : si l'envoi échoue ensuite, les anciens liens sont
  // déjà morts. L'inverse laisserait un lien valide derrière une révocation
  // annoncée — exactement ce qu'il ne faut pas.
  await ContractSignerModel.updateMany(
    { contractId: id, status: { $in: ["pending", "viewed"] } },
    { $inc: { tokenVersion: 1 } },
  );

  const signers = (await ContractSignerModel.find({
    contractId: id,
    status: { $in: ["pending", "viewed"] },
  })
    .sort({ order: 1, createdAt: 1 })
    .lean()) as Doc[];

  if (signers.length === 0) {
    return NextResponse.json(
      { error: "Toutes les parties ont déjà répondu : il n'y a aucun lien à réémettre." },
      { status: 409 },
    );
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

  await ContractSignerModel.updateMany(
    { contractId: id, status: { $in: ["pending", "viewed"] } },
    { $set: { remindedAt: new Date() } },
  );

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "contract_sent",
    entityType: "Contract",
    entityId: id,
    metadata: { reissued: signers.length, failures: failures.length },
  });

  if (failures.length > 0) {
    return NextResponse.json({
      ok: true,
      error: `Les anciens liens sont révoqués, mais le nouveau lien n'est pas parti vers : ${failures.join(", ")}.`,
    });
  }

  return NextResponse.json({ ok: true, reissued: signers.length });
}
