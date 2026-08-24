import { ObjectId } from "mongodb";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { MediaModel } from "@/lib/db/models";
import { mediaBucket } from "@/lib/media/gridfs";
import { revalidateContent } from "@/lib/revalidate";

export const runtime = "nodejs";
const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maxBytes = 10 * 1024 * 1024;

/** Dimensions lues dans l'en-tête du fichier, sans dépendance de traitement d'image. */
function dimensions(bytes: Buffer, mime: string) {
  if (mime === "image/png" && bytes.subarray(1, 4).toString() === "PNG") return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (mime === "image/jpeg") { for (let i = 2; i < bytes.length - 9;) { if (bytes[i] !== 0xff) { i++; continue; } const marker = bytes[i + 1]; const size = bytes.readUInt16BE(i + 2); if (marker >= 0xc0 && marker <= 0xc3) return { height: bytes.readUInt16BE(i + 5), width: bytes.readUInt16BE(i + 7) }; i += 2 + size; } }
  return { width: 0, height: 0 };
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes + 64 * 1024) return NextResponse.json({ error: "Fichier trop volumineux (10 Mo maximum)." }, { status: 413 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Image requise." }, { status: 400 });
  if (file.size > maxBytes || !allowed.has(file.type)) return NextResponse.json({ error: "Format ou taille non autorisé." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const { width, height } = dimensions(buffer, file.type);

  await connectToDatabase();
  const bucket = mediaBucket();
  if (!bucket) return NextResponse.json({ error: "Base de médias indisponible." }, { status: 503 });

  const fileId = new ObjectId();
  await new Promise<void>((resolve, reject) =>
    Readable.from(buffer)
      .pipe(bucket.openUploadStreamWithId(fileId, file.name, { metadata: { contentType: file.type, width, height } }))
      .on("error", reject)
      .on("finish", resolve),
  );

  const doc = await MediaModel.create({
    name: String(form?.get("name") || file.name).slice(0, 160),
    filename: file.name.slice(0, 240),
    provider: "gridfs",
    gridFsFileId: fileId,
    mimeType: file.type,
    contentType: file.type,
    size: file.size,
    width,
    height,
    alt: { fr: String(form?.get("alt") || "").slice(0, 1000), en: "" },
    category: String(form?.get("category") || "").slice(0, 100),
  });

  revalidateContent("media");
  return NextResponse.json({ id: String(doc._id), url: `/api/media/${doc._id}`, name: doc.get("name") }, { status: 201 });
}
