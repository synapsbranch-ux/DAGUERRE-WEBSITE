import { AdminDatabaseError, AdminPageHeader } from "@/components/admin/AdminTable";
import { BillingSettingsForm } from "@/components/admin/BillingSettingsForm";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { getBillingSettings } from "@/lib/platform/billing";

/** Identité fiscale de l'émetteur et valeurs par défaut des factures. */
export default async function BillingSettingsPage() {
  await requireAdmin();

  if (!(await tryConnectToDatabase())) return <AdminDatabaseError title="Facturation" />;

  const settings = await getBillingSettings();

  return (
    <>
      <AdminPageHeader
        group="Système"
        title="Facturation"
        description="Ces valeurs préremplissent les nouvelles factures. Celles déjà émises portent leur propre copie et ne changent pas."
      />

      <div className="mt-8 max-w-4xl">
        <BillingSettingsForm
          initial={{
            legalName: settings.legalName,
            address: settings.address,
            email: settings.email,
            phone: settings.phone,
            defaultCurrency: settings.defaultCurrency,
            paymentTermsDays: String(settings.paymentTermsDays),
            taxes: settings.taxes.map((tax) => ({
              label: tax.label,
              ratePercent: String(tax.ratePpm / 10_000),
              registration: tax.registration,
            })),
            defaultTerms: settings.defaultTerms,
            defaultNotes: settings.defaultNotes,
          }}
        />
      </div>
    </>
  );
}
