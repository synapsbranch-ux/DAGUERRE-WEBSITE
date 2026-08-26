import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ContentResourceModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { isDuplicateKeyError } from "@/lib/platform/idempotency";
import { announceRestrictedResource } from "@/lib/platform/resources";
import { revalidateContent } from "@/lib/revalidate";
import { contentResourceInputSchema } from "@/lib/validation-platform";

/**
 * Création d'une ressource de la bibliothèque.
 *
 * La publication est datée ici quand elle est demandée sans date explicite :
 * les pages publiques filtrent sur `publishedAt <= maintenant`, une ressource
 * publiée sans date n'apparaîtrait jamais.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = contentResourceInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();
  const session = await readSession();
  const data = parsed.data;

  try {
    const doc = await ContentResourceModel.create({
      ...data,
      fileId: data.fileId || null,
      categoryId: data.categoryId || null,
      publishedAt: data.publishedAt
        ? new Date(data.publishedAt)
        : data.status === "published"
          ? new Date()
          : null,
      authorId: session?.user.id ?? "",
    });

    if (data.status === "published") {
      // Seules les ressources nominatives sont annoncées à leurs destinataires.
      await announceRestrictedResource({
        slug: data.slug.fr,
        title: data.title.fr,
        visibility: data.visibility,
        status: data.status,
        allowedUserIds: data.allowedUserIds,
      });

      await recordAudit({
        actorId: session?.user.id,
        actorEmail: session?.user.email,
        action: "resource_published",
        entityType: "ContentResource",
        entityId: String(doc._id),
        metadata: { slug: data.slug.fr, visibility: data.visibility },
      });
    }

    revalidateContent("resources", { slug: data.slug.fr });
    return NextResponse.json({ id: String(doc._id) }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "Ce slug est déjà utilisé." }, { status: 409 });
    }
    return NextResponse.json({ error: "L'enregistrement a échoué." }, { status: 500 });
  }
}
