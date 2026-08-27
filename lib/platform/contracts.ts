import { ContractModel, ContractSignerModel, StoredFileModel } from "@/lib/db/models/platform";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { readPrivateFile, storePrivateFile } from "@/lib/media/files";
import { documentHash, renderContractPdf, sealContract, type SignatureRecord } from "@/lib/pdf/contract";
import { SIGN_TTL_SECONDS, createToken, readToken, tokenPurpose } from "@/lib/platform/tokens";

/**
 * Cycle de vie d'un contrat soumis à signature.
 *
 * ## Le lien EST l'autorisation
 *
 * Un signataire n'a pas de compte. Ce qui l'autorise à ouvrir et à signer, c'est
 * un jeton signé qui le désigne — rien d'autre. Trois conséquences tenues ici :
 *
 * 1. Le sujet du jeton compose l'identifiant du signataire **et** la version de
 *    son jeton. Incrémenter `tokenVersion` en base révoque d'un coup tous les
 *    liens déjà envoyés, sans table de jetons à purger.
 * 2. Le jeton expire. Une capacité qui engage une partie n'a aucune raison
 *    d'être éternelle.
 * 3. Le jeton ne dit **que** « ce signataire, ce contrat ». Il n'ouvre aucun
 *    autre document, et n'accorde aucun droit de lecture ailleurs.
 *
 * ## Le document présenté est figé
 *
 * À l'envoi, le PDF réellement soumis aux signataires est produit une fois,
 * stocké, et son empreinte SHA-256 conservée. Tout ce qui suit — consultations,
 * signatures, scellement — se rattache à cette empreinte. Un contrat modifié
 * après envoi produirait une empreinte différente : c'est ce qui rend la piste
 * d'audit démontrable.
 */

type Doc = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Jetons de signature                                                 */
/* ------------------------------------------------------------------ */

export function signerToken(signerId: string, version: number): string {
  return createToken(tokenPurpose.contractSign, `${signerId}:${version}`, SIGN_TTL_SECONDS);
}

/**
 * Relit un jeton de signature.
 *
 * Renvoie `null` sur toute anomalie — signature invalide, jeton expiré, sujet
 * mal formé. L'appelant répond alors 404 : distinguer « lien invalide » de
 * « contrat inexistant » renseignerait un curieux sur ce qui existe.
 */
export function readSignerToken(token: string | null | undefined): { signerId: string; version: number } | null {
  const subject = readToken(tokenPurpose.contractSign, token);
  if (!subject) return null;

  const separator = subject.lastIndexOf(":");
  if (separator <= 0) return null;

  const signerId = subject.slice(0, separator);
  const version = Number(subject.slice(separator + 1));
  if (!signerId || !Number.isInteger(version) || version < 1) return null;

  return { signerId, version };
}

/* ------------------------------------------------------------------ */
/* Préparation du document présenté                                    */
/* ------------------------------------------------------------------ */

export type PreparedDocument = { fileId: string; hash: string; bytes: Buffer };

/**
 * Produit le PDF qui sera réellement soumis aux signataires.
 *
 * Un contrat rédigé ici est rendu ; un PDF déposé est repris tel quel. Dans les
 * deux cas le résultat est stocké et son empreinte figée : c'est ce document-là
 * que les parties liront, et c'est de lui que le document scellé devra dériver.
 */
export async function prepareContractDocument(contract: Doc): Promise<PreparedDocument | null> {
  const source = String(contract.source ?? "generated");

  let bytes: Buffer | null = null;

  if (source === "uploaded") {
    const file = (await StoredFileModel.findById(contract.sourceFileId).lean()) as Doc | null;
    if (!file) return null;
    bytes = await readPrivateFile(file.gridFsFileId);
  } else {
    const localeValue = String(contract.locale ?? "");
    bytes = await renderContractPdf({
      contractNumber: String(contract.contractNumber ?? ""),
      title: String(contract.title ?? ""),
      body: String(contract.body ?? ""),
      locale: isLocale(localeValue) ? localeValue : defaultLocale,
    });
  }

  if (!bytes) return null;

  const filename = `${String(contract.contractNumber ?? "contrat")}.pdf`;
  const gridFsFileId = await storePrivateFile(bytes, filename, "application/pdf");

  const stored = await StoredFileModel.create({
    filename,
    originalFilename: filename,
    mimeType: "application/pdf",
    size: bytes.length,
    gridFsFileId,
    visibility: "admin_only",
    label: `${String(contract.contractNumber ?? "")} — présenté`,
    uploadedBy: "",
  });

  return { fileId: String(stored._id), hash: documentHash(bytes), bytes };
}

/* ------------------------------------------------------------------ */
/* Scellement                                                          */
/* ------------------------------------------------------------------ */

/**
 * Scelle le contrat si tous les signataires ont signé.
 *
 * Idempotent et **conditionnel** : la mise à jour finale ne s'applique que si le
 * contrat n'est pas déjà `signed`. Deux signatures qui arrivent en même temps ne
 * produisent donc pas deux documents scellés.
 *
 * Renvoie `true` si le scellement vient d'avoir lieu.
 */
export async function sealIfComplete(contractId: string): Promise<boolean> {
  const contract = (await ContractModel.findById(contractId).lean()) as Doc | null;
  if (!contract) return false;
  if (contract.status === "signed" || contract.status === "cancelled") return false;

  const signers = (await ContractSignerModel.find({ contractId }).sort({ order: 1, createdAt: 1 }).lean()) as Doc[];
  if (signers.length === 0) return false;

  // Un seul refus suffit à interrompre : rien à sceller.
  if (signers.some((signer) => signer.status === "declined")) return false;
  if (!signers.every((signer) => signer.status === "signed")) return false;

  const presented = (await StoredFileModel.findById(contract.presentedFileId).lean()) as Doc | null;
  if (!presented) return false;

  const source = await readPrivateFile(presented.gridFsFileId);
  if (!source) return false;

  const localeValue = String(contract.locale ?? "");
  const locale: Locale = isLocale(localeValue) ? localeValue : defaultLocale;

  const records: SignatureRecord[] = signers.map((signer) => ({
    name: String(signer.name ?? ""),
    email: String(signer.email ?? ""),
    role: String(signer.role ?? ""),
    mode: String(signer.mode) === "drawn" ? "drawn" : "typed",
    value: String(signer.signatureValue ?? ""),
    signedAt: signer.signedAt instanceof Date ? signer.signedAt : new Date(),
    ip: String(signer.ip ?? ""),
    userAgent: String(signer.userAgent ?? ""),
  }));

  const sealed = await sealContract(source, records, {
    contractNumber: String(contract.contractNumber ?? ""),
    title: String(contract.title ?? ""),
    hash: String(contract.documentHash ?? ""),
    locale,
  });

  const filename = `${String(contract.contractNumber ?? "contrat")}-signe.pdf`;
  const gridFsFileId = await storePrivateFile(sealed, filename, "application/pdf");

  const stored = await StoredFileModel.create({
    filename,
    originalFilename: filename,
    mimeType: "application/pdf",
    size: sealed.length,
    gridFsFileId,
    visibility: "specific_client",
    ownerUserId: String(contract.clientId ?? ""),
    label: `${String(contract.contractNumber ?? "")} — signé`,
    uploadedBy: "",
  });

  // Réservation atomique : le premier appel à aboutir scelle, les autres non.
  const claimed = await ContractModel.findOneAndUpdate(
    { _id: contractId, status: { $nin: ["signed", "cancelled"] } },
    { $set: { status: "signed", completedAt: new Date(), sealedFileId: String(stored._id) } },
    { new: true },
  ).lean();

  return Boolean(claimed);
}

/**
 * Recalcule le statut d'un contrat d'après ses signataires.
 *
 * Le statut n'est pas saisi : il se déduit. `signed` reste la seule transition
 * qui passe par `sealIfComplete`, parce qu'elle produit un document.
 */
export async function refreshContractStatus(contractId: string): Promise<void> {
  const contract = (await ContractModel.findById(contractId).select("status").lean()) as Doc | null;
  if (!contract) return;
  if (["signed", "cancelled", "declined", "expired"].includes(String(contract.status))) return;

  const signers = (await ContractSignerModel.find({ contractId }).select("status").lean()) as Doc[];
  if (signers.length === 0) return;

  if (signers.some((signer) => signer.status === "declined")) {
    await ContractModel.updateOne(
      { _id: contractId, status: { $nin: ["signed", "cancelled"] } },
      { $set: { status: "declined", completedAt: new Date() } },
    );
    return;
  }

  const signed = signers.filter((signer) => signer.status === "signed").length;
  if (signed > 0 && signed < signers.length) {
    await ContractModel.updateOne(
      { _id: contractId, status: "sent" },
      { $set: { status: "partially_signed" } },
    );
  }
}

/**
 * Le contrat a-t-il dépassé sa date limite ?
 *
 * Isolé de tout composant à dessein : lire l'heure courante pendant un rendu
 * React est une impureté, et la règle `react-hooks/purity` le signale à juste
 * titre. La question posée ici n'est pas un état d'interface, c'est un fait
 * métier — et c'est le même fait que vérifie la route de signature.
 */
export function isContractExpired(contract: Doc): boolean {
  return contract.expiresAt instanceof Date && contract.expiresAt.getTime() < Date.now();
}

/**
 * Ferme les contrats dont la date limite est passée.
 *
 * Idempotent : la sélection ne retient que ce qui est encore ouvert, si bien
 * qu'une seconde exécution ne trouve plus rien. Sans ce travail, `expiresAt` ne
 * serait honoré qu'au moment où quelqu'un tente de signer — un contrat périmé
 * resterait affiché « en attente de signature » indéfiniment dans le tableau de
 * bord, et sa date limite ne vaudrait rien.
 */
export async function markExpiredContracts(now = new Date()): Promise<number> {
  const result = await ContractModel.updateMany(
    { status: { $in: ["sent", "partially_signed"] }, expiresAt: { $ne: null, $lt: now } },
    { $set: { status: "expired", completedAt: now } },
  );

  return result.modifiedCount ?? 0;
}

/**
 * Signataire suivant à qui la main revient.
 *
 * Quand un ordre est imposé (`order` non nul), un signataire ne peut ouvrir le
 * document qu'une fois les précédents passés. `order: 0` signifie « sans ordre »
 * et laisse tout le monde signer quand il veut.
 */
export function isSignerTurn(signer: Doc, all: Doc[]): boolean {
  const order = Number(signer.order ?? 0);
  if (!order) return true;

  return all
    .filter((other) => Number(other.order ?? 0) > 0 && Number(other.order) < order)
    .every((other) => other.status === "signed");
}
