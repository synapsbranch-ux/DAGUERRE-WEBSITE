import { NextResponse } from "next/server";

import { tryConnectToDatabase } from "@/lib/db/client";
import { ContractModel, ContractSignerModel, StoredFileModel } from "@/lib/db/models/platform";
import { readPrivateFile } from "@/lib/media/files";
import { readSignerToken } from "@/lib/platform/contracts";
import { slidingWindow } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";

export const runtime = "nodejs";

type Doc = Record<string, unknown>;

const notFound = () => NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 404 });

/**
 * Lecture du document par une partie externe.
 *
 * Le jeton désigne un signataire, et le signataire désigne **un** contrat :
 * aucun identifiant de fichier n'est accepté depuis l'URL. Un lien volé ne
 * donne donc accès qu'au document qu'il concerne, jamais à un autre.
 *
 * Tant que la signature n'est pas achevée, c'est le document **présenté** qui
 * est servi — celui dont l'empreinte est figée. Une fois scellé, c'est le
 * document final, signatures et piste d'audit incluses : chaque partie doit
 * pouvoir récupérer sa copie sans compte.
 *
 * L'ouverture est aussi ce qui matérialise la consultation : le premier accès
 * fait passer le signataire de « invité » à « a consulté ». C'est un élément
 * de la piste d'audit, pas une statistique.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = readSignerToken(url.searchParams.get("jeton"));
  if (!parsed) return notFound();

  if (!(await slidingWindow(`contract-doc:${clientIp(request)}`, 60, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  if (!(await tryConnectToDatabase())) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const signer = (await ContractSignerModel.findById(parsed.signerId).lean()) as Doc | null;
  if (!signer) return notFound();
  if (Number(signer.tokenVersion ?? 1) !== parsed.version) return notFound();

  const contract = (await ContractModel.findById(String(signer.contractId ?? "")).lean()) as Doc | null;
  if (!contract) return notFound();
  if (contract.status === "draft") return notFound();

  // Première ouverture : la consultation est datée une fois, pas à chaque
  // rechargement. La condition sur le statut évite d'écraser un état ultérieur.
  if (signer.status === "pending") {
    await ContractSignerModel.updateOne(
      { _id: signer._id, status: "pending" },
      { $set: { status: "viewed", viewedAt: new Date() } },
    );
  }

  const sealed = contract.status === "signed" && contract.sealedFileId;
  const fileId = sealed ? contract.sealedFileId : contract.presentedFileId;

  const stored = (await StoredFileModel.findById(fileId).lean()) as Doc | null;
  if (!stored) return notFound();

  const bytes = await readPrivateFile(stored.gridFsFileId);
  if (!bytes) return notFound();

  const number = String(contract.contractNumber ?? "contrat");
  const filename = sealed ? `${number}-signe.pdf` : `${number}.pdf`;
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");

  /*
   * Affichage en ligne par défaut : le signataire doit pouvoir **lire** avant
   * de signer, et l'obliger à télécharger puis rouvrir le document romprait le
   * parcours. `?telecharger=1` bascule en pièce jointe pour le bouton dédié.
   *
   * `Content-Security-Policy: sandbox` accompagne l'affichage en ligne : un PDF
   * peut embarquer du script, et le bac à sable lui retire tout accès à notre
   * origine. C'est ce qui rend l'affichage en ligne acceptable ici, alors que
   * le reste du site sert ses fichiers privés en pièce jointe.
   */
  const attachment = url.searchParams.get("telecharger") === "1";
  const disposition = attachment ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(bytes.length),
      "content-disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "content-security-policy": "sandbox",
      "x-content-type-options": "nosniff",
      // Le jeton est dans l'URL : une copie retenue par un intermédiaire
      // survivrait à la révocation du lien.
      "cache-control": "private, no-store",
      "referrer-policy": "no-referrer",
    },
  });
}
