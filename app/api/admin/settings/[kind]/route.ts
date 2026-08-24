import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { isSingleton, singletonResources } from "@/lib/admin-content";
import { revalidateContent } from "@/lib/revalidate";
import { readJson } from "@/lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { kind } = await params;
  if (!isSingleton(kind)) return NextResponse.json({ error: "Ressource inconnue" }, { status: 404 });

  const resource = singletonResources[kind];
  await connectToDatabase();
  return NextResponse.json(await resource.model.findOne({ key: resource.key }).lean());
}

export async function PUT(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { kind } = await params;
  if (!isSingleton(kind)) return NextResponse.json({ error: "Ressource inconnue" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const resource = singletonResources[kind];
  const parsed = resource.schema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();
  const doc = await resource.model.findOneAndUpdate(
    { key: resource.key },
    { ...(parsed.data as Record<string, unknown>), key: resource.key },
    { upsert: true, new: true, runValidators: true },
  );

  revalidateContent(kind);
  return NextResponse.json({ id: String(doc._id) });
}
