import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/client";
import {
  ContentDownloadModel,
  ContentResourceModel,
  StoredFileModel,
} from "@/lib/db/models/platform";
import { clientIp, validObjectId } from "@/lib/http";
import { downloadHeaders, readPrivateFile } from "@/lib/media/files";
import { readPlatformSession } from "@/lib/platform/access";
import { isAdminRole } from "@/lib/platform/enums";
import { resourceAccessFilter } from "@/lib/platform/queries";
import { slidingWindow } from "@/lib/rate-limit";

export const runtime = "nodejs";

type ResourceDoc = {
  _id: unknown;
  status?: string;
  visibility?: string;
  publishedAt?: Date | null;
  fileId?: unknown;
  externalUrl?: string;
};

type FileDoc = {
  gridFsFileId?: unknown;
  originalFilename?: string;
  filename?: string;
  mimeType?: string;
};

/**
 * Téléchargement d'une ressource de la bibliothèque.
 *
 * Trois conditions, vérifiées **dans la requête** plutôt qu'après coup :
 *
 * 1. la ressource est publiée et sa date de publication est passée ;
 * 2. sa portée autorise ce visiteur — `resourceAccessFilter` est le même
 *    filtre que celui des pages de liste, donc rien de téléchargeable qui ne
 *    soit visible, ni l'inverse ;
 * 3. le fichier lié existe encore.
 *
 * Le téléchargement est ensuite enregistré. Pour un visiteur anonyme, seul
 * l'événement est conservé : ni adresse IP, ni empreinte de navigateur — le
 * compteur sert à savoir quelle ressource intéresse, pas qui l'a prise.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (!slidingWindow(`download:${clientIp(request)}`, 60, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de téléchargements. Réessayez plus tard." }, { status: 429 });
  }

  await connectToDatabase();
  const session = await readPlatformSession();
  const isAdmin = session ? isAdminRole(session.user.role) : false;

  const resource = (await ContentResourceModel.findOne(
    isAdmin
      ? { _id: id }
      : {
          $and: [
            { _id: id },
            { status: "published", publishedAt: { $lte: new Date() } },
            resourceAccessFilter(session?.user.id ?? null),
          ],
        },
  ).lean()) as ResourceDoc | null;

  if (!resource) {
    // Une ressource réservée aux comptes connectés mérite une invitation à se
    // connecter plutôt qu'un 404 opaque.
    if (!session) {
      const restricted = await ContentResourceModel.exists({
        _id: id,
        status: "published",
        visibility: { $in: ["authenticated", "private"] },
      });
      if (restricted) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await recordDownload(id, session?.user.id ?? "");

  // Ressource hébergée ailleurs : on redirige, il n'y a pas de binaire ici.
  if (!resource.fileId && resource.externalUrl) {
    return NextResponse.redirect(String(resource.externalUrl), 302);
  }

  const file = (await StoredFileModel.findById(resource.fileId).lean()) as FileDoc | null;
  if (!file) return NextResponse.json({ error: "Fichier indisponible." }, { status: 404 });

  const bytes = await readPrivateFile(file.gridFsFileId);
  if (!bytes) return NextResponse.json({ error: "Fichier indisponible." }, { status: 404 });

  const filename = String(file.originalFilename || file.filename || "document");
  return new NextResponse(new Uint8Array(bytes), {
    headers: downloadHeaders(filename, String(file.mimeType ?? ""), bytes.length),
  });
}

/** Comptage « au mieux » : un échec d'écriture ne prive personne du fichier. */
async function recordDownload(resourceId: string, userId: string): Promise<void> {
  try {
    await Promise.all([
      ContentDownloadModel.create({ resourceId, userId, downloadedAt: new Date() }),
      ContentResourceModel.updateOne({ _id: resourceId }, { $inc: { downloadCount: 1 } }),
    ]);
  } catch (error) {
    console.error("[ressources] comptage du téléchargement impossible :", error);
  }
}
