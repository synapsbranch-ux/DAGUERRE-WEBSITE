import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { getSiteSettings } from "@/lib/content";
import { connectToDatabase } from "@/lib/db/client";
import { InvoiceModel, StoredFileModel } from "@/lib/db/models/platform";
import { isEmailConfigured } from "@/lib/email/provider";
import { publicUrl, sendTransactionalEmail } from "@/lib/email/service";
import { invoiceIssuedEmail } from "@/lib/email/templates";
import { validObjectId } from "@/lib/http";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { storePrivateFile } from "@/lib/media/files";
import { renderInvoicePdf, type InvoiceDocument } from "@/lib/pdf/invoice";
import { recordAudit } from "@/lib/platform/audit";
import { getBillingSettings, issuerFrom } from "@/lib/platform/billing";
import { formatDate } from "@/lib/platform/format";
import { formatMoney } from "@/lib/platform/money";
import { notify } from "@/lib/platform/notifications";
import { href } from "@/lib/routes";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

type Doc = Record<string, unknown>;

/**
 * Émission d'une facture.
 *
 * Trois choses se produisent, dans cet ordre, et l'ordre compte :
 *
 * 1. **Le PDF est produit et stocké.** Une fois émise, la facture ne se
 *    régénère plus : c'est ce fichier-là que le client téléchargera dans six
 *    ans. Le régénérer à la demande ferait diverger la copie consultée de la
 *    copie reçue au premier changement de taux ou de raison sociale.
 * 2. **Le statut passe à « envoyée »**, par une mise à jour conditionnelle sur
 *    `draft` : un double clic ne produit pas deux numéros ni deux courriels.
 * 3. **Le courriel part**, PDF en pièce jointe.
 *
 * Si l'envoi échoue, la facture **reste émise** : le document existe, il est
 * numéroté, et l'administrateur peut le transmettre autrement. Revenir en
 * brouillon rouvrirait la porte à un second numéro pour la même prestation.
 */
export async function POST(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Envoi de courriel non configuré : renseignez RESEND_API_KEY et MAIL_FROM." },
      { status: 503 },
    );
  }

  await connectToDatabase();

  const invoice = (await InvoiceModel.findById(id).lean()) as Doc | null;
  if (!invoice) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (invoice.status !== "draft") {
    return NextResponse.json(
      { error: `Cette facture est déjà « ${String(invoice.status)} ». Aucun second envoi n'a été déclenché.` },
      { status: 409 },
    );
  }

  const billTo = (invoice.billTo ?? {}) as Doc;
  const recipient = String(billTo.email ?? "");
  if (!recipient) {
    return NextResponse.json(
      { error: "Aucune adresse de facturation : renseignez-la avant d'émettre." },
      { status: 400 },
    );
  }

  const localeValue = String(invoice.locale ?? "");
  const locale: Locale = isLocale(localeValue) ? localeValue : defaultLocale;

  const [settings, site] = await Promise.all([getBillingSettings(), getSiteSettings(locale)]);

  const issuedAt = new Date();
  const items = (Array.isArray(invoice.items) ? (invoice.items as Doc[]) : []).map((item) => ({
    name: String(item.name ?? ""),
    description: String(item.description ?? ""),
    quantity: Number(item.quantity ?? 0),
    unitPrice: Number(item.unitPrice ?? 0),
    amount: Number(item.amount ?? 0),
  }));

  const document: InvoiceDocument = {
    invoiceNumber: String(invoice.invoiceNumber ?? ""),
    locale,
    currency: String(invoice.currency ?? "CAD"),
    issuedAt,
    dueAt: invoice.dueAt instanceof Date ? invoice.dueAt : null,
    billTo: {
      name: String(billTo.name ?? ""),
      email: recipient,
      company: String(billTo.company ?? ""),
      address: String(billTo.address ?? ""),
    },
    items,
    subtotal: Number(invoice.subtotal ?? 0),
    discount: Number(invoice.discount ?? 0),
    taxes: (Array.isArray(invoice.taxes) ? (invoice.taxes as Doc[]) : []).map((tax) => ({
      label: String(tax.label ?? ""),
      ratePpm: Number(tax.ratePpm ?? 0),
      amount: Number(tax.amount ?? 0),
      registration: String(tax.registration ?? ""),
    })),
    total: Number(invoice.total ?? 0),
    amountPaid: Number(invoice.amountPaid ?? 0),
    notes: String(invoice.notes ?? ""),
    terms: String(invoice.terms ?? ""),
  };

  let pdf: Buffer;
  let fileId: string;

  try {
    pdf = await renderInvoicePdf(document, issuerFrom(settings, site?.brandName ?? "Daguerre"));

    const filename = `${document.invoiceNumber}.pdf`;
    const gridFsFileId = await storePrivateFile(pdf, filename, "application/pdf");

    const stored = await StoredFileModel.create({
      filename,
      originalFilename: filename,
      mimeType: "application/pdf",
      size: pdf.length,
      gridFsFileId,
      visibility: "specific_client",
      ownerUserId: String(invoice.clientId ?? ""),
      label: document.invoiceNumber,
      uploadedBy: "",
    });
    fileId = String(stored._id);
  } catch (error) {
    console.error("[factures] PDF non produit :", error);
    return NextResponse.json({ error: "La facture n'a pas pu être rendue en PDF." }, { status: 500 });
  }

  // Réservation atomique : seul le premier appel fait basculer le statut.
  const claimed = await InvoiceModel.findOneAndUpdate(
    { _id: id, status: "draft" },
    { $set: { status: "sent", issuedAt, documentFileId: fileId } },
    { new: true },
  ).lean();

  if (!claimed) {
    return NextResponse.json(
      { error: "Cette facture vient d'être émise par ailleurs." },
      { status: 409 },
    );
  }

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "invoice_sent",
    entityType: "Invoice",
    entityId: id,
    metadata: { to: recipient, total: document.total },
  });

  const clientId = String(invoice.clientId ?? "");
  if (clientId) {
    await notify({
      userId: clientId,
      type: "invoice_issued",
      title: document.invoiceNumber,
      href: href("portalInvoices", locale),
    });
  }

  const outcome = await sendTransactionalEmail(
    recipient,
    invoiceIssuedEmail(locale, {
      invoiceNumber: document.invoiceNumber,
      total: formatMoney(document.total, document.currency, locale),
      dueDate: document.dueAt ? formatDate(document.dueAt.toISOString(), locale) : "",
      url: publicUrl("portalInvoices", locale),
    }),
    [{ filename: `${document.invoiceNumber}.pdf`, content: pdf, contentType: "application/pdf" }],
  );

  if (!outcome.ok) {
    // La facture reste émise : le document existe et porte son numéro. On
    // signale l'échec pour que l'administrateur la transmette autrement.
    return NextResponse.json(
      {
        ok: true,
        emailed: false,
        error: `La facture est émise, mais le courriel n'est pas parti : ${outcome.error}`,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true, emailed: true });
}
