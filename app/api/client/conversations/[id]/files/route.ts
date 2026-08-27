import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/client";
import { ConversationModel, StoredFileModel } from "@/lib/db/models/platform";
import { clientIp, validObjectId } from "@/lib/http";
import { MAX_FILE_BYTES, checkFile, safeFilename, storePrivateFile } from "@/lib/media/files";
import { isDenied, notFoundResponse, requireSessionApi } from "@/lib/platform/access";
import { slidingWindow } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

/**
 * Pièce jointe déposée par le client dans une conversation.
 *
 * La portée est décidée **ici**, au dépôt, jamais fournie par le navigateur :
 * `specific_client`, propriétaire = l'auteur, rattachée à cette conversation.
 * Un client ne peut donc pas déposer un fichier « public », ni le rattacher à
 * la conversation de quelqu'un d'autre — l'appartenance de la conversation est
 * vérifiée par la requête elle-même, `clientId` venant de la session.
 *
 * Le type est vérifié deux fois — l'annonce du navigateur, puis les premiers
 * octets du contenu — parce que la première se falsifie d'un clic.
 *
 * Le fichier est déposé avant l'envoi du message : `POST .../messages` reçoit
 * ensuite les identifiants et revérifie qu'ils appartiennent bien à l'auteur et
 * à cette conversation.
 */
export async function POST(request: Request, { params }: Ctx) {
  const guard = await requireSessionApi();
  if (isDenied(guard)) return guard.denied;

  const user = guard.session.user;

  // Un dépôt de fichiers est bien plus coûteux qu'un message : la limite est
  // plus basse, et distincte.
  if (!(await slidingWindow(`upload:${user.id}:${clientIp(request)}`, 20, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de dépôts. Réessayez plus tard." }, { status: 429 });
  }

  const { id } = await params;
  if (!validObjectId(id)) return notFoundResponse();

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

  // L'appartenance est portée par la requête : une conversation qui n'est pas
  // la vôtre ne remonte pas, et la réponse est un 404 — un 403 confirmerait son
  // existence.
  const conversation = await ConversationModel.exists({
    _id: id,
    clientId: user.id,
    status: { $ne: "archived" },
  });
  if (!conversation) return notFoundResponse();

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
      ownerUserId: user.id,
      conversationId: id,
      uploadedBy: user.id,
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
