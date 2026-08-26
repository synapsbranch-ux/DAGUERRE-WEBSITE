import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { changeQuoteStatus } from "@/lib/platform/quotes";
import { quoteStatusUpdateSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Changement d'état d'une demande.
 *
 * La transition est vérifiée contre la machine à états côté serveur : un
 * enchaînement impossible est refusé même si l'interface l'a proposé par
 * erreur. Le message facultatif est publié dans la conversation du dossier —
 * c'est ainsi qu'une demande d'information atteint réellement le client.
 */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = quoteStatusUpdateSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });

  await connectToDatabase();
  const session = await readSession();

  const result = await changeQuoteStatus(
    id,
    parsed.data.status,
    { id: session?.user.id ?? "", email: session?.user.email ?? "", role: "admin" },
    { message: parsed.data.message, actorName: session?.user.name ?? "" },
  );

  if (!result.ok) {
    return result.reason === "not_found"
      ? NextResponse.json({ error: "Introuvable" }, { status: 404 })
      : NextResponse.json(
          { error: "Cette transition de statut n'est pas autorisée depuis l'état courant." },
          { status: 409 },
        );
  }

  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "quote_status_changed",
    entityType: "QuoteRequest",
    entityId: id,
    metadata: { from: result.from, to: result.to },
  });

  return NextResponse.json({ ok: true, status: result.to });
}
