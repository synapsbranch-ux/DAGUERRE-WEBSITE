import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { InvoiceModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { getBillingSettings } from "@/lib/platform/billing";
import { computeInvoice } from "@/lib/platform/invoices";
import { parseAmountToMinor } from "@/lib/platform/money";
import { nextInvoiceNumber } from "@/lib/platform/numbers";
import { invoiceInputSchema } from "@/lib/validation-platform";

/**
 * Création d'une facture.
 *
 * Elle naît **toujours** en brouillon : `status` n'appartient pas au schéma
 * d'entrée. Le numéro, lui, est attribué dès la création par un compteur
 * atomique — la séquence comptable doit rester continue, et une facture
 * supprimée avant émission est la seule qui puisse laisser un trou, d'où la
 * suppression réservée aux brouillons.
 *
 * Les totaux sont **recalculés ici**. Le navigateur en affiche pour confirmer
 * la saisie, mais une requête forgée annonçant `total: 0` sur des lignes
 * facturées n'aurait aucun effet : c'est ce calcul qui est enregistré.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = invoiceInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const items = parsed.data.items.map((item) => {
    const unitPrice = parseAmountToMinor(item.unitPrice);
    return { name: item.name, description: item.description ?? "", quantity: item.quantity, unitPrice };
  });

  if (items.some((item) => item.unitPrice === null)) {
    return NextResponse.json({ error: "Un prix unitaire est illisible." }, { status: 400 });
  }

  const discount = parseAmountToMinor(parsed.data.discount);
  if (discount === null) return NextResponse.json({ error: "Remise illisible." }, { status: 400 });

  await connectToDatabase();

  const settings = await getBillingSettings();
  // Sans taxe explicite, on retient celles des réglages — c'est le cas courant.
  const taxes = parsed.data.taxes.length > 0 ? parsed.data.taxes : settings.taxes;

  const totals = computeInvoice(
    items.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice as number })),
    discount,
    taxes,
  );

  const session = await readSession();

  const doc = await InvoiceModel.create({
    invoiceNumber: await nextInvoiceNumber(),
    clientId: parsed.data.clientId,
    billTo: parsed.data.billTo,
    quoteRequestId: parsed.data.quoteRequestId || null,
    projectId: parsed.data.projectId || null,
    status: "draft",
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
    notes: parsed.data.notes || settings.defaultNotes,
    terms: parsed.data.terms || settings.defaultTerms,
    createdById: session?.user.id ?? "",
  });

  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "invoice_created",
    entityType: "Invoice",
    entityId: String(doc._id),
    metadata: { total: totals.total, currency: parsed.data.currency },
  });

  return NextResponse.json({ id: String(doc._id), invoiceNumber: doc.invoiceNumber }, { status: 201 });
}
