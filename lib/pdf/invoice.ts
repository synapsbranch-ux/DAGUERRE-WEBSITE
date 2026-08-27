import type { Locale } from "@/lib/i18n";
import { formatMoney } from "@/lib/platform/money";
import { amountDue } from "@/lib/platform/invoices";
import {
  CONTENT_WIDTH,
  MARGIN,
  MUTED,
  PAGE_WIDTH,
  createDocument,
  finish,
  gap,
  heading,
  paginate,
  rule,
  table,
  text,
  textRight,
  type DocumentBuilder,
} from "@/lib/pdf/layout";

/**
 * Rendu PDF d'une facture.
 *
 * Le document est produit **une fois, à l'émission**, puis stocké et servi tel
 * quel. Le régénérer à chaque téléchargement rouvrirait la porte à un écart
 * entre la facture que le client a reçue et celle qu'il consulte : un taux de
 * taxe modifié entre-temps, un nom d'entreprise corrigé, et les deux ne
 * concordent plus. Ce que le client a reçu doit rester consultable à
 * l'identique.
 */

export type InvoiceDocument = {
  invoiceNumber: string;
  locale: Locale;
  currency: string;
  issuedAt: Date | null;
  dueAt: Date | null;
  billTo: { name: string; email: string; company: string; address: string };
  items: { name: string; description: string; quantity: number; unitPrice: number; amount: number }[];
  subtotal: number;
  discount: number;
  taxes: { label: string; rateBasisPoints: number; amount: number; registration: string }[];
  total: number;
  amountPaid: number;
  notes: string;
  terms: string;
};

export type Issuer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  /** Numéros d'inscription aux taxes, affichés sous l'émetteur. */
  registrations: string[];
};

const T = {
  fr: {
    invoice: "FACTURE",
    billedTo: "Facturé à",
    issued: "Date d'émission",
    due: "Échéance",
    description: "Description",
    quantity: "Qté",
    unitPrice: "Prix unitaire",
    amount: "Montant",
    subtotal: "Sous-total",
    discount: "Remise",
    total: "Total",
    paid: "Déjà réglé",
    due_amount: "Solde à payer",
    notes: "Notes",
    terms: "Conditions",
    page: (n: number, total: number) => `Page ${n} sur ${total}`,
  },
  en: {
    invoice: "INVOICE",
    billedTo: "Billed to",
    issued: "Issue date",
    due: "Due date",
    description: "Description",
    quantity: "Qty",
    unitPrice: "Unit price",
    amount: "Amount",
    subtotal: "Subtotal",
    discount: "Discount",
    total: "Total",
    paid: "Already paid",
    due_amount: "Balance due",
    notes: "Notes",
    terms: "Terms",
    page: (n: number, total: number) => `Page ${n} of ${total}`,
  },
} as const;

function formatDate(value: Date | null, locale: Locale): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", { dateStyle: "long" }).format(value);
}

/** Taux affiché à côté du libellé : 500 points de base → « 5 % ». */
function formatRate(basisPoints: number, locale: Locale): string {
  const value = basisPoints / 100;
  const formatted = new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    maximumFractionDigits: 3,
  }).format(value);
  return locale === "fr" ? `${formatted} %` : `${formatted}%`;
}

/** Ligne du bloc de totaux, libellé à gauche et montant aligné à droite. */
function totalLine(
  builder: DocumentBuilder,
  label: string,
  value: string,
  options: { bold?: boolean; size?: number } = {},
): void {
  const size = options.size ?? 10;
  gap(builder, size * 1.5);
  const left = MARGIN + CONTENT_WIDTH * 0.55;
  builder.page.drawText(label, {
    x: left,
    y: builder.y,
    size,
    font: options.bold ? builder.fonts.bold : builder.fonts.regular,
    color: options.bold ? undefined : MUTED,
  });
  textRight(builder, value, PAGE_WIDTH - MARGIN, { size, bold: options.bold });
}

export async function renderInvoicePdf(invoice: InvoiceDocument, issuer: Issuer): Promise<Buffer> {
  const locale = invoice.locale;
  const t = T[locale];
  const money = (minor: number) => formatMoney(minor, invoice.currency, locale);

  const builder = await createDocument();

  // En-tête : émetteur à gauche, identité du document à droite.
  text(builder, issuer.name, { size: 16, bold: true });
  for (const line of [issuer.address, issuer.email, issuer.phone].filter(Boolean)) {
    text(builder, line, { size: 9, color: MUTED });
  }
  for (const registration of issuer.registrations.filter(Boolean)) {
    text(builder, registration, { size: 9, color: MUTED });
  }

  builder.page.drawText(t.invoice, {
    x: PAGE_WIDTH - MARGIN - builder.fonts.bold.widthOfTextAtSize(t.invoice, 20),
    y: builder.page.getHeight() - MARGIN - 16,
    size: 20,
    font: builder.fonts.bold,
  });
  builder.page.drawText(invoice.invoiceNumber, {
    x:
      PAGE_WIDTH -
      MARGIN -
      builder.fonts.regular.widthOfTextAtSize(invoice.invoiceNumber, 11),
    y: builder.page.getHeight() - MARGIN - 34,
    size: 11,
    font: builder.fonts.regular,
    color: MUTED,
  });

  gap(builder, 18);
  rule(builder);
  gap(builder, 10);

  // Destinataire et dates.
  const anchor = builder.y;
  text(builder, t.billedTo, { size: 9, bold: true, color: MUTED, width: CONTENT_WIDTH * 0.55 });
  for (const line of [
    invoice.billTo.company,
    invoice.billTo.name,
    invoice.billTo.address,
    invoice.billTo.email,
  ].filter(Boolean)) {
    text(builder, line, { size: 10, width: CONTENT_WIDTH * 0.55 });
  }

  const afterRecipient = builder.y;
  builder.y = anchor;

  const dateColumn = MARGIN + CONTENT_WIDTH * 0.62;
  for (const [label, value] of [
    [t.issued, formatDate(invoice.issuedAt, locale)],
    [t.due, formatDate(invoice.dueAt, locale)],
  ]) {
    gap(builder, 14);
    builder.page.drawText(label, {
      x: dateColumn,
      y: builder.y,
      size: 9,
      font: builder.fonts.bold,
      color: MUTED,
    });
    textRight(builder, value, PAGE_WIDTH - MARGIN, { size: 10 });
  }

  builder.y = Math.min(afterRecipient, builder.y);
  gap(builder, 24);

  // Lignes facturées.
  table(
    builder,
    [
      { header: t.description, width: CONTENT_WIDTH * 0.46 },
      { header: t.quantity, width: CONTENT_WIDTH * 0.12, align: "right" },
      { header: t.unitPrice, width: CONTENT_WIDTH * 0.21, align: "right" },
      { header: t.amount, width: CONTENT_WIDTH * 0.21, align: "right" },
    ],
    invoice.items.map((item) => [
      item.description ? `${item.name}\n${item.description}` : item.name,
      String(item.quantity),
      money(item.unitPrice),
      money(item.amount),
    ]),
  );

  // Totaux.
  gap(builder, 6);
  totalLine(builder, t.subtotal, money(invoice.subtotal));
  if (invoice.discount > 0) totalLine(builder, t.discount, `- ${money(invoice.discount)}`);
  for (const tax of invoice.taxes) {
    const label = tax.registration
      ? `${tax.label} (${formatRate(tax.rateBasisPoints, locale)}) · ${tax.registration}`
      : `${tax.label} (${formatRate(tax.rateBasisPoints, locale)})`;
    totalLine(builder, label, money(tax.amount));
  }

  gap(builder, 4);
  rule(builder);
  totalLine(builder, t.total, money(invoice.total), { bold: true, size: 12 });

  if (invoice.amountPaid > 0) {
    totalLine(builder, t.paid, `- ${money(invoice.amountPaid)}`);
    totalLine(builder, t.due_amount, money(amountDue(invoice.total, invoice.amountPaid)), {
      bold: true,
    });
  }

  if (invoice.notes.trim()) {
    gap(builder, 18);
    heading(builder, t.notes, 11);
    text(builder, invoice.notes, { size: 9 });
  }

  if (invoice.terms.trim()) {
    gap(builder, 14);
    heading(builder, t.terms, 11);
    text(builder, invoice.terms, { size: 9, color: MUTED });
  }

  paginate(builder, t.page);
  return finish(builder);
}
