import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ResourceCategoryModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { isDuplicateKeyError } from "@/lib/platform/idempotency";
import { revalidateContent } from "@/lib/revalidate";
import { resourceCategoryInputSchema } from "@/lib/validation-platform";

/**
 * Catégories de la bibliothèque, gérées au CMS.
 *
 * Aucune catégorie n'est codée en dur : les intitulés changent avec l'offre,
 * et une liste figée dans le code obligerait à un déploiement pour ajouter
 * « Automatisation ».
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = resourceCategoryInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();

  try {
    const doc = await ResourceCategoryModel.create(parsed.data);
    revalidateContent("resources");
    return NextResponse.json({ id: String(doc._id) }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "Ce slug de catégorie existe déjà." }, { status: 409 });
    }
    return NextResponse.json({ error: "L'enregistrement a échoué." }, { status: 500 });
  }
}
