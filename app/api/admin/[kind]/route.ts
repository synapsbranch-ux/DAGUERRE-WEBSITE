import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/client";
import { requireAdminApi } from "@/lib/admin";
import { adminResources, isAdminResource } from "@/lib/admin-content";
import { revalidateContent } from "@/lib/revalidate";
import { frenchSlug, normalizePublication, type WriteData } from "@/lib/admin-write";
import { readJson } from "@/lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { kind } = await params;
  if (!isAdminResource(kind)) return NextResponse.json({ error: "Ressource inconnue" }, { status: 404 });

  await connectToDatabase();
  return NextResponse.json(await adminResources[kind].model.find().sort({ updatedAt: -1 }).lean());
}

export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { kind } = await params;
  if (!isAdminResource(kind)) return NextResponse.json({ error: "Ressource inconnue" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const resource = adminResources[kind];
  const parsed = resource.createSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();
  const value = normalizePublication(parsed.data as WriteData);

  try {
    const doc = await resource.model.create(value);
    revalidateContent(kind, { slug: frenchSlug(value) });
    return NextResponse.json({ id: String(doc._id) }, { status: 201 });
  } catch (error) {
    // Index unique violé : slug déjà pris pour cette ressource.
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "Ce slug est déjà utilisé." }, { status: 409 });
    }
    return NextResponse.json({ error: "L’enregistrement a échoué." }, { status: 500 });
  }
}
