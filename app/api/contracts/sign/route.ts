import { NextResponse } from "next/server";

import { tryConnectToDatabase } from "@/lib/db/client";
import { ContractModel, ContractSignerModel, StoredFileModel } from "@/lib/db/models/platform";
import { absoluteLink } from "@/lib/email/layout";
import { sendTransactionalEmail } from "@/lib/email/service";
import { contractSignedEmail } from "@/lib/email/templates";
import { clientIp, readJson } from "@/lib/http";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { readPrivateFile } from "@/lib/media/files";
import { checkSignaturePng } from "@/lib/pdf/png";
import { recordAudit } from "@/lib/platform/audit";
import {
  isContractExpired,
  isSignerTurn,
  readSignerToken,
  refreshContractStatus,
  sealIfComplete,
} from "@/lib/platform/contracts";
import { notify } from "@/lib/platform/notifications";
import { slidingWindow } from "@/lib/rate-limit";
import { href } from "@/lib/routes";
import { declineInputSchema, signatureInputSchema } from "@/lib/validation-platform";

export const runtime = "nodejs";

type Doc = Record<string, unknown>;

/** Le lien porte l'autorisation ; l'absence de contexte se répond en 404. */
const notFound = () => NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 404 });

/**
 * Apposition d'une signature par une partie externe.
 *
 * **Il n'y a pas de session ici.** Ce qui autorise, c'est le jeton signé, et
 * lui seul. Toute anomalie — signature invalide, jeton expiré, version révoquée,
 * contrat au mauvais statut, tour d'un autre signataire — se répond par un 404
 * identique : distinguer les cas renseignerait un curieux sur ce qui existe.
 *
 * La piste d'audit est constituée **ici**, à partir de ce que le serveur
 * observe : adresse IP, agent déclaré, horodatage. Rien de ce que le navigateur
 * prétend sur son identité n'est retenu — le signataire est celui que le jeton
 * désigne, pas celui qu'un champ de formulaire annonce.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const parsedToken = readSignerToken(url.searchParams.get("jeton"));
  if (!parsedToken) return notFound();

  // Un lien volé ne doit pas non plus servir à marteler le service.
  if (!(await slidingWindow(`sign:${clientIp(request)}`, 20, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  }

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const body = json.data as { action?: unknown };
  const declining = body?.action === "decline";

  if (!(await tryConnectToDatabase())) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const signer = (await ContractSignerModel.findById(parsedToken.signerId).lean()) as Doc | null;
  if (!signer) return notFound();

  // Version révoquée : l'administrateur a réémis les liens.
  if (Number(signer.tokenVersion ?? 1) !== parsedToken.version) return notFound();

  if (signer.status === "signed") {
    return NextResponse.json({ error: "Vous avez déjà signé ce document." }, { status: 409 });
  }
  if (signer.status === "declined") {
    return NextResponse.json({ error: "Vous avez déjà refusé ce document." }, { status: 409 });
  }

  const contractId = String(signer.contractId ?? "");
  const contract = (await ContractModel.findById(contractId).lean()) as Doc | null;
  if (!contract) return notFound();

  if (!["sent", "partially_signed"].includes(String(contract.status))) {
    return NextResponse.json(
      { error: "Ce document n'est plus ouvert à la signature." },
      { status: 409 },
    );
  }

  if (isContractExpired(contract)) {
    await ContractModel.updateOne(
      { _id: contractId, status: { $in: ["sent", "partially_signed"] } },
      { $set: { status: "expired" } },
    );
    return NextResponse.json({ error: "Ce document a expiré." }, { status: 409 });
  }

  const siblings = (await ContractSignerModel.find({ contractId }).lean()) as Doc[];
  if (!isSignerTurn(signer, siblings)) {
    return NextResponse.json(
      { error: "Ce n'est pas encore votre tour de signer : une autre partie doit signer avant vous." },
      { status: 409 },
    );
  }

  const ip = clientIp(request);
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 400);

  /* ---------------------------------------------------------------- */
  /* Refus                                                             */
  /* ---------------------------------------------------------------- */

  if (declining) {
    const parsed = declineInputSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Motif invalide." }, { status: 400 });

    await ContractSignerModel.updateOne(
      { _id: signer._id, status: { $in: ["pending", "viewed"] } },
      {
        $set: {
          status: "declined",
          declinedAt: new Date(),
          declineReason: parsed.data.reason,
          ip,
          userAgent,
        },
      },
    );

    await refreshContractStatus(contractId);

    await recordAudit({
      actorEmail: String(signer.email ?? ""),
      action: "contract_signed",
      entityType: "Contract",
      entityId: contractId,
      metadata: { outcome: "declined", signer: String(signer.email ?? "") },
    });

    return NextResponse.json({ ok: true, outcome: "declined" });
  }

  /* ---------------------------------------------------------------- */
  /* Signature                                                         */
  /* ---------------------------------------------------------------- */

  const parsed = signatureInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Signature ou consentement manquant." }, { status: 400 });
  }

  let value = parsed.data.value;

  if (parsed.data.mode === "drawn") {
    /*
     * Le tracé est vérifié **avant** d'être conservé : le décodeur PNG de
     * pdf-lib boucle indéfiniment sur certaines entrées malformées, et le
     * scellement se ferait plus tard, hors de portée de cette requête. Refuser
     * ici évite d'enregistrer une bombe à retardement.
     */
    const image = checkSignaturePng(value);
    if (!image.ok) {
      return NextResponse.json(
        { error: `Signature illisible : ${image.reason}` },
        { status: 400 },
      );
    }
    value = `data:image/png;base64,${image.bytes.toString("base64")}`;
  } else if (value.trim().length < 2) {
    return NextResponse.json({ error: "Saisissez votre nom pour signer." }, { status: 400 });
  }

  // Conditionnelle : deux envois simultanés ne signent qu'une fois.
  const applied = await ContractSignerModel.updateOne(
    { _id: signer._id, status: { $in: ["pending", "viewed"] } },
    {
      $set: {
        status: "signed",
        mode: parsed.data.mode,
        signatureValue: value,
        signedAt: new Date(),
        consentedAt: new Date(),
        ip,
        userAgent,
      },
    },
  );

  if (applied.modifiedCount === 0) {
    return NextResponse.json({ error: "Cette signature a déjà été enregistrée." }, { status: 409 });
  }

  await refreshContractStatus(contractId);

  const sealed = await sealIfComplete(contractId).catch((error) => {
    // Le scellement peut échouer sans annuler la signature, qui est acquise.
    console.error("[contrats] scellement impossible :", error);
    return false;
  });

  await recordAudit({
    actorEmail: String(signer.email ?? ""),
    action: "contract_signed",
    entityType: "Contract",
    entityId: contractId,
    metadata: { outcome: "signed", signer: String(signer.email ?? ""), sealed },
  });

  if (sealed) await announceCompletion(contractId);

  return NextResponse.json({ ok: true, outcome: "signed", completed: sealed });
}

/**
 * Prévient toutes les parties que le document est signé.
 *
 * Le document scellé voyage en pièce jointe : chaque partie doit pouvoir
 * l'archiver sans dépendre d'un lien, ni d'un compte qu'elle n'a pas.
 */
async function announceCompletion(contractId: string): Promise<void> {
  const contract = (await ContractModel.findById(contractId).lean()) as Doc | null;
  if (!contract) return;

  const localeValue = String(contract.locale ?? "");
  const locale: Locale = isLocale(localeValue) ? localeValue : defaultLocale;

  const stored = (await StoredFileModel.findById(contract.sealedFileId).lean()) as Doc | null;
  const bytes = stored ? await readPrivateFile(stored.gridFsFileId) : null;

  const signers = (await ContractSignerModel.find({ contractId }).select("email").lean()) as Doc[];

  const email = contractSignedEmail(locale, {
    title: String(contract.title ?? ""),
    contractNumber: String(contract.contractNumber ?? ""),
    url: absoluteLink(href("portalContracts", locale)),
  });

  const attachments = bytes
    ? [
        {
          filename: `${String(contract.contractNumber ?? "contrat")}-signe.pdf`,
          content: bytes,
          contentType: "application/pdf",
        },
      ]
    : undefined;

  for (const signer of signers) {
    await sendTransactionalEmail(String(signer.email ?? ""), email, attachments).catch(() => undefined);
  }

  const clientId = String(contract.clientId ?? "");
  if (clientId) {
    await notify({
      userId: clientId,
      type: "contract_to_sign",
      title: String(contract.title ?? ""),
      href: href("portalContracts", locale),
    });
  }
}
