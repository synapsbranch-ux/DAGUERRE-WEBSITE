import { NextResponse } from "next/server";

import { tryConnectToDatabase } from "@/lib/db/client";
import { validObjectId } from "@/lib/http";
import { downloadHeaders, readPrivateFile } from "@/lib/media/files";
import { readPlatformSession } from "@/lib/platform/access";
import { resolveFileAccess } from "@/lib/platform/file-access";

export const runtime = "nodejs";

/**
 * Téléchargement d'un fichier privé.
 *
 * L'URL ne contient que l'identifiant du **document de métadonnées** : la clé
 * de stockage GridFS ne quitte jamais le serveur, et il n'existe aucune URL
 * publique permanente vers le binaire.
 *
 * Un fichier existant mais interdit renvoie 404, pas 403 : distinguer les deux
 * ferait de l'énumération d'identifiants un outil de reconnaissance sur les
 * documents des autres clients.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Base injoignable : on l'annonce, plutôt que de laisser filer une trace
  // d'exécution dans une réponse publique.
  if (!(await tryConnectToDatabase())) {
    return NextResponse.json({ error: "Stockage indisponible." }, { status: 503 });
  }

  const session = await readPlatformSession();
  const access = await resolveFileAccess(id, session);

  if (!access.allowed) {
    if (access.reason === "unauthenticated") {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const bytes = await readPrivateFile(access.file.gridFsFileId);
  if (!bytes) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const filename = String(access.file.originalFilename || access.file.filename || "document");
  return new NextResponse(new Uint8Array(bytes), {
    headers: downloadHeaders(filename, String(access.file.mimeType ?? ""), bytes.length),
  });
}
