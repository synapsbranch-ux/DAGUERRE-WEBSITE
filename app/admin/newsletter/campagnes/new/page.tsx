import { AdminPageHeader } from "@/components/admin/AdminTable";
import { CampaignEditor } from "@/components/admin/CampaignEditor";
import { requireAdmin } from "@/lib/admin";

/** Création d'une campagne : elle naît en brouillon, l'envoi vient plus tard. */
export default async function NewCampaignPage() {
  await requireAdmin();

  return (
    <>
      <AdminPageHeader
        group="Marketing"
        title="Nouvelle campagne"
        description="Enregistrez le brouillon pour accéder à l'aperçu, au test et à l'envoi."
      />
      <CampaignEditor
        sendable={false}
        initial={{
          name: "",
          subject: "",
          previewText: "",
          content: "",
          locale: "fr",
          audienceType: "all_active",
          status: "draft",
        }}
      />
    </>
  );
}
