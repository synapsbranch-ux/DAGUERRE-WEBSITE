import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { InvoiceModel, InvoicePaymentModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { computeInvoice } from "@/lib/platform/invoices";
import { parseAmountToMinor } from "@/lib/platform/money";
import { invoiceInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Introuvable" }, { status: 404 });

/**
 * Modification d'une facture.
 *
 * **Seul un brouillon se modifie.** Une facture envoyée est un document
 * comptable remis à un tiers : en réécrire les montants produirait un
 * historique qui ne correspond à rien de ce que le client détient. Pour
 * corriger, on annule et on réémet.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = invoiceInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const items = parsed.data.items.map((item) => ({
    name: item.name,
    description: item.description ?? "",
    quantity: item.quantity,
    unitPrice: parseAmountToMinor(item.unitPrice),
  }));
  if (items.some((item) => item.unitPrice === null)) {
    return NextResponse.json({ error: "Un prix unitaire est illisible." }, { status: 400 });
  }

  const discount = parseAmountToMinor(parsed.data.discount);
  if (discount === null) return NextResponse.json({ error: "Remise illisible." }, { status: 400 });

  await connectToDatabase();

  const totals = computeInvoice(
    items.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice as number })),
    discount,
    parsed.data.taxes,
  );

  const doc = await InvoiceModel.findOneAndUpdate(
    { _id: id, status: "draft" },
    {
      $set: {
        clientId: parsed.data.clientId,
        billTo: parsed.data.billTo,
        quoteRequestId: parsed.data.quoteRequestId || null,
        projectId: parsed.data.projectId || null,
        currency: parsed.data.currency,
        locale: parsed.data.locale,
        items: items.map((item, index) => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: totals.amounts[index],
          position: index,
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        taxes: totals.taxes.map((tax) => ({
          label: tax.label,
          ratePpm: tax.ratePpm,
          registration: tax.registration ?? "",
          amount: tax.amount,
        })),
        total: totals.total,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
        notes: parsed.data.notes,
        terms: parsed.data.terms,
      },
    },
    { new: true },
  );

  if (!doc) {
    const exists = await InvoiceModel.exists({ _id: id });
    return exists
      ? NextResponse.json(
          { error: "Une facture émise n'est plus modifiable. Annulez-la et réémettez-en une." },
          { status: 409 },
        )
      : notFound();
  }

  return NextResponse.json({ id: String(doc._id) });
}

/**
 * Suppression — réservée aux brouillons.
 *
 * Une facture émise s'annule, elle ne s'efface pas : la séquence comptable doit
 * rester continue et le numéro ne doit jamais être réattribué.
 */
export async function DELETE(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  await connectToDatabase();
  const doc = await InvoiceModel.findOneAndDelete({ _id: id, status: "draft" }).lean();

  if (!doc) {
    const exists = await InvoiceModel.exists({ _id: id });
    return exists
      ? NextResponse.json(
          { error: "Seul un brouillon peut être supprimé. Une facture émise s'annule." },
          { status: 409 },
        )
      : notFound();
  }

  await InvoicePaymentModel.deleteMany({ invoiceId: id });
  return NextResponse.json({ ok: true });
}

/** Annulation d'une facture émise — la trace demeure. */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  await connectToDatabase();

  const doc = await InvoiceModel.findOneAndUpdate(
    { _id: id, status: { $nin: ["paid", "cancelled"] } },
    { $set: { status: "cancelled" } },
    { new: true },
  ).lean();

  if (!doc) {
    const exists = await InvoiceModel.exists({ _id: id });
    return exists
      ? NextResponse.json(
          { error: "Une facture payée ou déjà annulée ne peut plus changer d'état." },
          { status: 409 },
        )
      : notFound();
  }

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "invoice_cancelled",
    entityType: "Invoice",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
