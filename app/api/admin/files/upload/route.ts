import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { StoredFileModel } from "@/lib/db/models/platform";
import {
  MAX_FILE_BYTES,
  checkFile,
  safeFilename,
  storePrivateFile,
} from "@/lib/media/files";
import { recordAudit } from "@/lib/platform/audit";
import { fileMetadataSchema } from "@/lib/validation-platform";

export const runtime = "nodejs";

/**
 * Téléversement d'un document privé par l'administration.
 *
 * Le fichier va dans le bucket GridFS privé ; seule sa fiche de métadonnées
 * est exposée, sous la forme `/api/files/<id>`. La portée est décidée ici, au
 * dépôt : un document déposé pour un client précis n'a jamais de moment où il
 * serait accessible à tous.
 *
 * Le type est vérifié deux fois — l'annonce du navigateur puis les premiers
 * octets — parce que la première se falsifie d'un clic.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_FILE_BYTES + 128 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (20 Mo maximum)." }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier requis." }, { status: 400 });

  const metadata = fileMetadataSchema.safeParse({
    visibility: String(form?.get("visibility") ?? "admin_only"),
    ownerUserId: String(form?.get("ownerUserId") ?? ""),
    quoteRequestId: String(form?.get("quoteRequestId") ?? ""),
    projectId: String(form?.get("projectId") ?? ""),
    conversationId: String(form?.get("conversationId") ?? ""),
    label: String(form?.get("label") ?? ""),
  });
  if (!metadata.success) return NextResponse.json({ error: "Métadonnées invalides." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const check = checkFile(file, bytes);
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

  await connectToDatabase();

  const filename = safeFilename(file.name, check.extension);
  const session = await readSession();

  try {
    const gridFsFileId = await storePrivateFile(bytes, filename, file.type);

    const doc = await StoredFileModel.create({
      filename,
      originalFilename: file.name.slice(0, 240),
      mimeType: file.type,
      size: bytes.length,
      gridFsFileId,
      visibility: metadata.data.visibility,
      ownerUserId: metadata.data.ownerUserId,
      quoteRequestId: metadata.data.quoteRequestId || null,
      projectId: metadata.data.projectId || null,
      conversationId: metadata.data.conversationId || null,
      label: metadata.data.label,
      uploadedBy: session?.user.id ?? "",
    });

    if (metadata.data.projectId || metadata.data.ownerUserId) {
      await recordAudit({
        actorId: session?.user.id,
        actorEmail: session?.user.email,
        action: "client_document_uploaded",
        entityType: "StoredFile",
        entityId: String(doc._id),
        metadata: {
          visibility: metadata.data.visibility,
          projectId: metadata.data.projectId,
          ownerUserId: metadata.data.ownerUserId,
        },
      });
    }

    return NextResponse.json(
      {
        id: String(doc._id),
        url: `/api/files/${doc._id}`,
        filename: file.name,
        size: bytes.length,
        mimeType: file.type,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[files] téléversement impossible :", error);
    return NextResponse.json({ error: "Le fichier n'a pas pu être enregistré." }, { status: 503 });
  }
}
