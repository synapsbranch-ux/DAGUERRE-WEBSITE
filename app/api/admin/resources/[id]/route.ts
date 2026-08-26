import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ContentResourceModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { isDuplicateKeyError } from "@/lib/platform/idempotency";
import { revalidateContent } from "@/lib/revalidate";
import { contentResourceInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };
type Doc = { status?: string; slug?: { fr?: string }; publishedAt?: Date | null };

const notFound = () => NextResponse.json({ error: "Introuvable" }, { status: 404 });

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = contentResourceInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();
  const previous = (await ContentResourceModel.findById(id).lean()) as Doc | null;
  if (!previous) return notFound();

  const data = parsed.data;
  const publishedAt = data.publishedAt
    ? new Date(data.publishedAt)
    : data.status === "published"
      ? (previous.publishedAt instanceof Date ? previous.publishedAt : new Date())
      : null;

  try {
    const doc = await ContentResourceModel.findByIdAndUpdate(
      id,
      {
        $set: {
          ...data,
          fileId: data.fileId || null,
          categoryId: data.categoryId || null,
          publishedAt,
        },
      },
      { new: true, runValidators: true },
    );
    if (!doc) return notFound();

    const session = await readSession();

    // Seul un changement d'état de publication mérite une trace : enregistrer
    // chaque correction de faute de frappe noierait le journal.
    if (previous.status !== data.status && (data.status === "published" || previous.status === "published")) {
      await recordAudit({
        actorId: session?.user.id,
        actorEmail: session?.user.email,
        action: data.status === "published" ? "resource_published" : "resource_unpublished",
        entityType: "ContentResource",
        entityId: id,
        metadata: { from: previous.status ?? "", to: data.status, slug: data.slug.fr },
      });
    }

    revalidateContent("resources", { slug: data.slug.fr, previousSlug: previous.slug?.fr });
    return NextResponse.json({ id: String(doc._id) });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "Ce slug est déjà utilisé." }, { status: 409 });
    }
    return NextResponse.json({ error: "L'enregistrement a échoué." }, { status: 500 });
  }
}

/**
 * Retrait d'une ressource.
 *
 * Elle est **archivée**, jamais supprimée : le fichier peut avoir été
 * distribué, et l'historique des téléchargements y renvoie. Une archive
 * disparaît du site public et reste republiable.
 */
export async function DELETE(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  await connectToDatabase();
  const doc = (await ContentResourceModel.findByIdAndUpdate(
    id,
    { $set: { status: "archived" } },
    { new: true },
  ).lean()) as Doc | null;
  if (!doc) return notFound();

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "resource_unpublished",
    entityType: "ContentResource",
    entityId: id,
    metadata: { archived: true },
  });

  revalidateContent("resources", { slug: doc.slug?.fr });
  return NextResponse.json({ ok: true, archived: true });
}
