import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { ContactMessageModel } from "@/lib/db/models";
import { readJson, validObjectId } from "@/lib/http";
import { messageStatuses } from "@/lib/messages";

const statuses: ReadonlySet<string> = new Set(messageStatuses);

const notFound = () => NextResponse.json({ error: "Introuvable" }, { status: 404 });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const status =
    typeof json.data === "object" && json.data ? (json.data as { status?: unknown }).status : undefined;
  if (typeof status !== "string" || !statuses.has(status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }

  await connectToDatabase();
  const message = await ContactMessageModel.findByIdAndUpdate(
    id,
    { status, read: status !== "new" },
    { new: true },
  );
  return message ? NextResponse.json({ ok: true, status }) : notFound();
}

/** Un message est une donnée personnelle : sa suppression est définitive. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  await connectToDatabase();
  const message = await ContactMessageModel.findByIdAndDelete(id);
  return message ? NextResponse.json({ ok: true }) : notFound();
}
