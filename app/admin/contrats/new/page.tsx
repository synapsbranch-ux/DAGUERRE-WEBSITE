import { AdminPageHeader } from "@/components/admin/AdminTable";
import { ContractEditor } from "@/components/admin/ContractEditor";
import { requireAdmin } from "@/lib/admin";

/** Nouveau contrat — toujours créé en brouillon. */
export default async function NewContractPage() {
  await requireAdmin();

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title="Nouveau contrat"
        description="Enregistrez le brouillon pour pouvoir l'envoyer. Le numéro est attribué dès la création."
      />

      <div className="mt-8 max-w-3xl">
        <ContractEditor
          initial={{
            title: "",
            source: "generated",
            body: "",
            sourceFileId: "",
            sourceFileName: "",
            clientId: "",
            message: "",
            locale: "fr",
            expiresAt: "",
            signers: [{ name: "", email: "", role: "", order: "0" }],
            status: "draft",
          }}
        />
      </div>
    </>
  );
}
