import { AdminPageHeader } from "@/components/admin/AdminTable";
import { InvoiceEditor } from "@/components/admin/InvoiceEditor";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { getBillingSettings } from "@/lib/platform/billing";

/** Nouvelle facture, préremplie par les réglages de facturation. */
export default async function NewInvoicePage() {
  await requireAdmin();

  const connected = await tryConnectToDatabase();
  const settings = connected
    ? await getBillingSettings()
    : { defaultCurrency: "CAD", paymentTermsDays: 30, taxes: [], defaultTerms: "", defaultNotes: "" };

  const due = new Date();
  due.setDate(due.getDate() + settings.paymentTermsDays);

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title="Nouvelle facture"
        description="Enregistrez le brouillon pour pouvoir l'émettre. Le numéro est attribué dès la création."
      />

      <div className="mt-8">
        <InvoiceEditor
          initial={{
            clientId: "",
            billTo: { name: "", email: "", company: "", address: "" },
            currency: settings.defaultCurrency,
            locale: "fr",
            items: [{ name: "", description: "", quantity: "1", unitPrice: "0" }],
            discount: "0",
            taxes: settings.taxes.map((tax) => ({
              label: tax.label,
              ratePercent: String(tax.ratePpm / 10_000),
              registration: tax.registration,
            })),
            dueAt: due.toISOString().slice(0, 10),
            notes: settings.defaultNotes,
            terms: settings.defaultTerms,
            status: "draft",
          }}
        />
      </div>
    </>
  );
}
