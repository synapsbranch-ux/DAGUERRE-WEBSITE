import { BillingSettingsModel, InvoiceModel, InvoicePaymentModel } from "@/lib/db/models/platform";
import type { Issuer } from "@/lib/pdf/invoice";
import { deriveInvoiceStatus } from "@/lib/platform/invoices";
import type { InvoiceStatus } from "@/lib/platform/enums";

/**
 * Réglages de facturation et tenue des comptes d'une facture.
 *
 * Deux règles gouvernent ce module :
 *
 * 1. **Les valeurs par défaut préremplissent, elles ne gouvernent pas.** Une
 *    facture émise porte sa propre copie des taxes, des conditions et de
 *    l'identité de l'émetteur. Modifier un taux ici ne réécrit rien de ce qui
 *    est déjà parti — ce que le client a reçu doit rester ce que la base
 *    contient.
 * 2. **Le montant réglé se recalcule, il ne s'incrémente pas.** Additionner à
 *    chaque paiement ferait dériver le total au premier enregistrement corrigé
 *    ou supprimé. La somme des paiements fait foi.
 */

export type BillingTax = { label: string; ratePpm: number; registration: string };

export type BillingSettings = {
  legalName: string;
  address: string;
  email: string;
  phone: string;
  defaultCurrency: string;
  paymentTermsDays: number;
  taxes: BillingTax[];
  defaultTerms: string;
  defaultNotes: string;
};

const FALLBACK: BillingSettings = {
  legalName: "",
  address: "",
  email: "",
  phone: "",
  defaultCurrency: "CAD",
  paymentTermsDays: 30,
  taxes: [],
  defaultTerms: "",
  defaultNotes: "",
};

type Doc = Record<string, unknown>;

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function getBillingSettings(): Promise<BillingSettings> {
  const doc = (await BillingSettingsModel.findOne({ key: "billing" }).lean()) as Doc | null;
  if (!doc) return { ...FALLBACK };

  const taxes = Array.isArray(doc.taxes) ? (doc.taxes as Doc[]) : [];

  return {
    legalName: str(doc.legalName),
    address: str(doc.address),
    email: str(doc.email),
    phone: str(doc.phone),
    defaultCurrency: str(doc.defaultCurrency) || "CAD",
    paymentTermsDays: Number(doc.paymentTermsDays ?? 30),
    taxes: taxes
      .map((tax) => ({
        label: str(tax.label),
        ratePpm: Number(tax.ratePpm ?? 0),
        registration: str(tax.registration),
      }))
      .filter((tax) => tax.label),
    defaultTerms: str(doc.defaultTerms),
    defaultNotes: str(doc.defaultNotes),
  };
}

/**
 * Identité de l'émetteur telle qu'elle figure sur le PDF.
 *
 * Sans raison sociale renseignée, on retombe sur le nom de marque plutôt que
 * de laisser un en-tête vide : une facture sans émetteur identifiable n'a
 * aucune valeur.
 */
export function issuerFrom(settings: BillingSettings, brandName: string): Issuer {
  return {
    name: settings.legalName || brandName,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    registrations: settings.taxes
      .filter((tax) => tax.registration)
      .map((tax) => `${tax.label} ${tax.registration}`),
  };
}

/**
 * Recalcule le montant réglé et en déduit le statut.
 *
 * Appelée après toute écriture de paiement. La somme est relue depuis la
 * collection des paiements — pas incrémentée — pour qu'une correction ou une
 * suppression se répercute exactement.
 */
export async function refreshInvoiceBalance(invoiceId: string): Promise<{
  amountPaid: number;
  status: InvoiceStatus;
} | null> {
  const invoice = (await InvoiceModel.findById(invoiceId)
    .select("status total dueAt")
    .lean()) as Doc | null;
  if (!invoice) return null;

  const payments = (await InvoicePaymentModel.find({ invoiceId })
    .select("amount")
    .lean()) as Doc[];

  const amountPaid = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const total = Number(invoice.total ?? 0);
  const dueAt = invoice.dueAt instanceof Date ? invoice.dueAt : null;

  const status = deriveInvoiceStatus(
    String(invoice.status ?? "draft") as InvoiceStatus,
    total,
    amountPaid,
    dueAt,
  );

  await InvoiceModel.updateOne(
    { _id: invoiceId },
    {
      $set: {
        amountPaid,
        status,
        // La date de règlement marque le moment où le solde est atteint, pas
        // celui du dernier paiement enregistré après coup.
        paidAt: status === "paid" ? (invoice.paidAt instanceof Date ? invoice.paidAt : new Date()) : null,
      },
    },
  );

  return { amountPaid, status };
}

/**
 * Passe en retard les factures échues et non réglées.
 *
 * Idempotent : la sélection ne retient que ce qui n'est pas déjà en retard, si
 * bien qu'une seconde exécution ne trouve plus rien. Appelée par le
 * planificateur.
 */
export async function markOverdueInvoices(now = new Date()): Promise<number> {
  const result = await InvoiceModel.updateMany(
    {
      status: { $in: ["sent", "partially_paid"] },
      dueAt: { $ne: null, $lt: now },
    },
    { $set: { status: "overdue" } },
  );

  return result.modifiedCount ?? 0;
}
