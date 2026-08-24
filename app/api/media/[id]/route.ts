import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/client";
import { MediaModel } from "@/lib/db/models";
import { mediaBucket } from "@/lib/media/gridfs";
import { validObjectId } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Sert un média stocké en GridFS.
 *
 * Route publique et non localisée : c'est elle que référencent les champs
 * image du CMS sous la forme `/api/media/<id>`. Les médias externes (Drive,
 * CDN) ne passent pas par ici — leur URL est utilisée directement.
 */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await connectToDatabase();
  const media = await MediaModel.findById(id).lean();
  if (!media || media.provider !== "gridfs" || !media.gridFsFileId) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const bucket = mediaBucket();
  if (!bucket) return NextResponse.json({ error: "Stockage indisponible." }, { status: 503 });

  const stream = bucket.openDownloadStream(new ObjectId(String(media.gridFsFileId)));
  const chunks: Uint8Array[] = [];

  try {
    await new Promise<void>((resolve, reject) =>
      stream
        .on("data", (chunk: Buffer) => chunks.push(chunk))
        .on("error", reject)
        .on("end", resolve),
    );
  } catch {
    // Document présent mais binaire absent : on ne renvoie jamais une réponse
    // vide qui passerait pour une image valide.
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(Buffer.concat(chunks)), {
    headers: {
      "content-type": media.mimeType || media.contentType || "application/octet-stream",
      // Le contenu d'un identifiant GridFS ne change jamais : remplacer une
      // image crée un nouveau média, donc une nouvelle URL.
      "cache-control": "public, max-age=31536000, immutable",
      etag: `"${String(media._id)}"`,
    },
  });
}
