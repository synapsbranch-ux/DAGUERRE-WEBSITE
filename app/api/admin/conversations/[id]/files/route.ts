import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ConversationModel, StoredFileModel } from "@/lib/db/models/platform";
import { validObjectId } from "@/lib/http";
import { MAX_FILE_BYTES, checkFile, safeFilename, storePrivateFile } from "@/lib/media/files";
import { recordAudit } from "@/lib/platform/audit";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

/**
 * Pièce jointe déposée par l'administration dans une conversation.
 *
 * Jumelle du dépôt côté client. La portée est décidée **ici**, jamais fournie
 * par le navigateur : `specific_client`, propriétaire = le client de la
 * conversation, rattachée à cette conversation. Passer par le téléversement
 * générique `/api/admin/files/upload` obligerait le formulaire à annoncer la
 * portée lui-même, et un champ caché mal renseigné publierait un document
 * client.
 *
 * Le type est vérifié deux fois — l'annonce du navigateur, puis les premiers
 * octets du contenu — parce que la première se falsifie d'un clic.
 */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_FILE_BYTES + 128 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (20 Mo maximum)." }, { status: 413 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier requis." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const check = checkFile(file, bytes);
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 400 });

  await connectToDatabase();

  const conversation = (await ConversationModel.findById(id)
    .select("clientId")
    .lean()) as { clientId?: unknown } | null;
  if (!conversation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const session = await readSession();
  const filename = safeFilename(file.name, check.extension);

  try {
    const gridFsFileId = await storePrivateFile(bytes, filename, file.type);

    const doc = await StoredFileModel.create({
      filename,
      originalFilename: file.name.slice(0, 240),
      mimeType: file.type,
      size: bytes.length,
      gridFsFileId,
      visibility: "specific_client",
      // Le destinataire du document est le client de la conversation — c'est
      // ce qui lui en ouvre la lecture depuis son espace.
      ownerUserId: String(conversation.clientId ?? ""),
      conversationId: id,
      uploadedBy: session?.user.id ?? "",
    });

    await recordAudit({
      actorId: session?.user.id,
      actorEmail: session?.user.email,
      action: "client_document_uploaded",
      entityType: "StoredFile",
      entityId: String(doc._id),
      metadata: { conversationId: id },
    });

    return NextResponse.json(
      { id: String(doc._id), filename: file.name, size: bytes.length },
      { status: 201 },
    );
  } catch (error) {
    console.error("[messagerie] pièce jointe non enregistrée :", error);
    return NextResponse.json({ error: "Le fichier n'a pas pu être enregistré." }, { status: 503 });
  }
}
