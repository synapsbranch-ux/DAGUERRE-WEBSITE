import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ContentResourceModel, ResourceCategoryModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { revalidateContent } from "@/lib/revalidate";
import { resourceCategoryInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Introuvable" }, { status: 404 });

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = resourceCategoryInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();
  const doc = await ResourceCategoryModel.findByIdAndUpdate(id, { $set: parsed.data }, { new: true });
  if (!doc) return notFound();

  revalidateContent("resources");
  return NextResponse.json({ id: String(doc._id) });
}

/**
 * Suppression d'une catégorie.
 *
 * Refusée tant qu'une ressource s'y rattache : sans ce garde-fou, les fiches
 * concernées perdraient leur classement en silence, et l'on ne saurait plus
 * pourquoi.
 */
export async function DELETE(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  await connectToDatabase();

  const used = await ContentResourceModel.countDocuments({ categoryId: id });
  if (used > 0) {
    return NextResponse.json(
      { error: `${used} ressource(s) utilisent cette catégorie. Reclassez-les d'abord.` },
      { status: 409 },
    );
  }

  const doc = await ResourceCategoryModel.findByIdAndDelete(id).lean();
  if (!doc) return notFound();

  revalidateContent("resources");
  return NextResponse.json({ ok: true });
}
