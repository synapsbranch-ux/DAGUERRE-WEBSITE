import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ContentResourceModel, StoredFileModel } from "@/lib/db/models/platform";
import { validObjectId } from "@/lib/http";
import { deletePrivateFile } from "@/lib/media/files";
import { recordAudit } from "@/lib/platform/audit";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Suppression d'un document privé.
 *
 * Deux garde-fous :
 *
 * - un fichier encore rattaché à une ressource publiée ne part pas : sa
 *   suppression laisserait un bouton « Télécharger » qui ne télécharge rien ;
 * - le binaire est effacé **avant** sa fiche. Si le stockage refuse, on
 *   conserve la fiche plutôt que d'abandonner un fichier sans référence,
 *   impossible à retrouver et impossible à purger.
 */
export async function DELETE(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await connectToDatabase();

  const file = (await StoredFileModel.findById(id).lean()) as {
    gridFsFileId?: unknown;
    originalFilename?: string;
    visibility?: string;
  } | null;
  if (!file) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const usedBy = await ContentResourceModel.countDocuments({ fileId: id });
  if (usedBy > 0) {
    return NextResponse.json(
      { error: "Ce fichier est la ressource d'une fiche de la bibliothèque. Détachez-le d'abord." },
      { status: 409 },
    );
  }

  const removed = await deletePrivateFile(file.gridFsFileId);
  if (!removed) {
    return NextResponse.json(
      { error: "Le fichier n'a pas pu être supprimé du stockage. La fiche est conservée." },
      { status: 503 },
    );
  }

  await StoredFileModel.findByIdAndDelete(id);

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "client_document_deleted",
    entityType: "StoredFile",
    entityId: id,
    metadata: { filename: file.originalFilename ?? "", visibility: file.visibility ?? "" },
  });

  return NextResponse.json({ ok: true });
}
