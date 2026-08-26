import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { QuoteNoteModel, QuoteRequestModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { logQuoteActivity } from "@/lib/platform/quotes";
import { quoteNoteInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Note interne sur un dossier.
 *
 * Les notes vivent dans leur **propre collection**, que rien du côté client
 * n'interroge. Un champ booléen sur les messages aurait suffi jusqu'au jour où
 * une requête oublie la condition ; ici, l'oubli est impossible.
 */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = quoteNoteInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Note invalide." }, { status: 400 });

  await connectToDatabase();
  const exists = await QuoteRequestModel.exists({ _id: id });
  if (!exists) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const session = await readSession();

  await QuoteNoteModel.create({
    quoteId: id,
    authorId: session?.user.id ?? "",
    authorName: session?.user.name ?? "",
    body: parsed.data.body,
  });

  await logQuoteActivity(id, "admin_note_added", {
    id: session?.user.id ?? "",
    email: session?.user.email ?? "",
    role: "admin",
  });

  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "quote_note_added",
    entityType: "QuoteRequest",
    entityId: id,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
