import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/client";
import { requireAdminApi } from "@/lib/admin";
import { adminResources, isAdminResource } from "@/lib/admin-content";
import { revalidateContent } from "@/lib/revalidate";
import { frenchSlug, normalizePublication, type WriteData } from "@/lib/admin-write";
import { deleteGridFsFile } from "@/lib/media/gridfs";
import { readJson, validObjectId } from "@/lib/http";

type Ctx = { params: Promise<{ kind: string; id: string }> };

const notFound = () => NextResponse.json({ error: "Introuvable" }, { status: 404 });

export async function GET(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { kind, id } = await params;
  if (!isAdminResource(kind) || !validObjectId(id)) return notFound();

  await connectToDatabase();
  const doc = await adminResources[kind].model.findById(id).lean();
  return doc ? NextResponse.json(doc) : notFound();
}

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { kind, id } = await params;
  if (!isAdminResource(kind) || !validObjectId(id)) return notFound();

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const resource = adminResources[kind];
  const parsed = resource.updateSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();
  const previous = (await resource.model.findById(id).lean()) as WriteData | null;
  if (!previous) return notFound();

  const value = normalizePublication(parsed.data as WriteData, previous);

  try {
    const doc = await resource.model.findByIdAndUpdate(id, value, { new: true, runValidators: true });
    if (!doc) return notFound();

    // Le slug a pu changer : l'ancienne URL doit cesser de servir un contenu
    // qui n'y vit plus.
    revalidateContent(kind, { slug: frenchSlug(value), previousSlug: frenchSlug(previous) });
    return NextResponse.json({ id: String(doc._id) });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "Ce slug est déjà utilisé." }, { status: 409 });
    }
    return NextResponse.json({ error: "L’enregistrement a échoué." }, { status: 500 });
  }
}

/**
 * Retrait d'une fiche.
 *
 * Les contenus éditoriaux sont **archivés**, jamais supprimés : un article ou
 * un projet retiré du site public reste consultable et restaurable depuis le
 * CMS. Seuls les médias et les messages disparaissent réellement.
 */
export async function DELETE(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { kind, id } = await params;
  if (!isAdminResource(kind) || !validObjectId(id)) return notFound();

  const resource = adminResources[kind];
  await connectToDatabase();

  if (resource.archivable) {
    const doc = (await resource.model
      .findByIdAndUpdate(id, { status: "archived" }, { new: true })
      .lean()) as WriteData | null;
    if (!doc) return notFound();

    revalidateContent(kind, { slug: frenchSlug(doc) });
    return NextResponse.json({ ok: true, archived: true });
  }

  const doc = (await resource.model.findById(id).lean()) as WriteData | null;
  if (!doc) return notFound();

  // Le binaire part en premier : si GridFS échoue, on garde le document Mongo
  // plutôt que d'abandonner un fichier et ses chunks sans référence.
  if (kind === "media" && doc.provider === "gridfs") {
    const removed = await deleteGridFsFile(doc.gridFsFileId);
    if (!removed) {
      return NextResponse.json(
        { error: "Le fichier n’a pas pu être supprimé du stockage. Média conservé." },
        { status: 503 },
      );
    }
  }

  await resource.model.findByIdAndDelete(id);
  revalidateContent(kind, { slug: frenchSlug(doc) });
  return NextResponse.json({ ok: true, archived: false });
}
