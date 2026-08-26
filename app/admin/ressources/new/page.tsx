import Link from "next/link";

import { AdminDatabaseError, AdminPageHeader } from "@/components/admin/AdminTable";
import { ContentResourceForm } from "@/components/admin/forms/ContentResourceForm";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { ResourceCategoryModel } from "@/lib/db/models/platform";
import { accountLabel, listClientAccounts } from "@/lib/platform/users";

export default async function NewResourcePage() {
  await requireAdmin();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Ressources" />;

  const [categoryDocs, accounts] = await Promise.all([
    ResourceCategoryModel.find().sort({ order: 1 }).lean(),
    listClientAccounts({ limit: 200 }),
  ]);

  return (
    <>
      <AdminPageHeader
        group="Contenus"
        title="Nouvelle ressource"
        actions={
          <Button asChild variant="secondary">
            <Link href="/admin/ressources">Retour à la liste</Link>
          </Button>
        }
      />
      <div className="mt-8">
        <ContentResourceForm
          categories={(categoryDocs as Record<string, unknown>[]).map((doc) => ({
            id: String(doc._id),
            name: String((doc.name as { fr?: string } | undefined)?.fr ?? ""),
          }))}
          clients={accounts.items.map((account) => ({ id: account.id, label: accountLabel(account) }))}
        />
      </div>
    </>
  );
}
