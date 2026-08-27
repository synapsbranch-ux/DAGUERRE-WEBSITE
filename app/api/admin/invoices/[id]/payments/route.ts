import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { InvoiceModel, InvoicePaymentModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { refreshInvoiceBalance } from "@/lib/platform/billing";
import { parseAmountToMinor } from "@/lib/platform/money";
import { paymentInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Enregistrement d'un encaissement.
 *
 * Chaque paiement est une ligne à part : un client peut régler en plusieurs
 * fois, et chaque encaissement garde sa date, son moyen et sa référence. Le
 * montant réglé de la facture s'en **déduit** — il n'est jamais incrémenté,
 * pour qu'une correction se répercute exactement.
 */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = paymentInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Paiement invalide." }, { status: 400 });

  const amount = parseAmountToMinor(parsed.data.amount);
  if (amount === null || amount <= 0) {
    return NextResponse.json({ error: "Montant illisible ou nul." }, { status: 400 });
  }

  await connectToDatabase();

  const invoice = (await InvoiceModel.findById(id).select("status").lean()) as {
    status?: string;
  } | null;
  if (!invoice) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (invoice.status === "draft") {
    return NextResponse.json(
      { error: "Cette facture n'est pas encore émise : un paiement ne peut pas s'y rattacher." },
      { status: 409 },
    );
  }
  if (invoice.status === "cancelled") {
    return NextResponse.json({ error: "Cette facture est annulée." }, { status: 409 });
  }

  const session = await readSession();

  await InvoicePaymentModel.create({
    invoiceId: id,
    amount,
    method: parsed.data.method,
    reference: parsed.data.reference,
    receivedAt: parsed.data.receivedAt ? new Date(parsed.data.receivedAt) : new Date(),
    note: parsed.data.note,
    recordedById: session?.user.id ?? "",
  });

  const balance = await refreshInvoiceBalance(id);

  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "payment_recorded",
    entityType: "Invoice",
    entityId: id,
    metadata: { amount, method: parsed.data.method },
  });

  return NextResponse.json({ ok: true, ...balance }, { status: 201 });
}
