import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDatabaseError, AdminPageHeader } from "@/components/admin/AdminTable";
import { ContractActions } from "@/components/admin/ContractActions";
import { ContractEditor } from "@/components/admin/ContractEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { ContractModel, ContractSignerModel, StoredFileModel } from "@/lib/db/models/platform";
import { validObjectId } from "@/lib/http";
import {
  contractSourceLabels,
  contractStatusLabels,
  signatureModeLabels,
  signerStatusLabels,
  type ContractSource,
  type ContractStatus,
  type SignatureMode,
  type SignerStatus,
} from "@/lib/platform/enums";
import { formatDate } from "@/lib/utils";

type Doc = Record<string, unknown>;

/**
 * Fiche d'un contrat.
 *
 * La colonne de droite est la **piste d'audit lisible** : qui a été invité, qui
 * a ouvert, qui a signé et quand, depuis quelle adresse. C'est la même matière
 * que celle imprimée en fin de document scellé ; la voir ici évite d'ouvrir le
 * PDF pour savoir où en est la signature.
 */
export default async function AdminContractPage({ params }: PageProps<"/admin/contrats/[id]">) {
  await requireAdmin();

  const { id } = await params;
  if (!validObjectId(id)) notFound();

  if (!(await tryConnectToDatabase())) return <AdminDatabaseError title="Contrat" />;

  const doc = (await ContractModel.findById(id).lean()) as Doc | null;
  if (!doc) notFound();

  const signers = (await ContractSignerModel.find({ contractId: id })
    .sort({ order: 1, createdAt: 1 })
    .lean()) as Doc[];

  const status = String(doc.status ?? "draft") as ContractStatus;
  const source = String(doc.source ?? "generated") as ContractSource;
  const pending = signers.filter((signer) => signer.status === "pending" || signer.status === "viewed");

  const sourceFile = doc.sourceFileId
    ? ((await StoredFileModel.findById(doc.sourceFileId).select("originalFilename filename").lean()) as Doc | null)
    : null;

  const hash = String(doc.documentHash ?? "");

  return (
    <>
      <AdminPageHeader
        group="Clients"
        title={String(doc.contractNumber ?? "")}
        description={String(doc.title ?? "")}
        actions={
          <>
            <Badge
              variant={
                status === "signed"
                  ? "default"
                  : status === "declined" || status === "expired"
                    ? "destructive"
                    : "outline"
              }
            >
              {contractStatusLabels[status]?.fr ?? status}
            </Badge>
            {doc.sealedFileId ? (
              <Button asChild variant="secondary">
                <a href={`/api/files/${String(doc.sealedFileId)}`} rel="nofollow">
                  Document signé
                </a>
              </Button>
            ) : null}
            {doc.presentedFileId ? (
              <Button asChild variant="secondary">
                <a href={`/api/files/${String(doc.presentedFileId)}`} rel="nofollow">
                  Document présenté
                </a>
              </Button>
            ) : null}
            <Button asChild variant="secondary">
              <Link href="/admin/contrats">Retour</Link>
            </Button>
          </>
        }
      />

      <dl className="mt-8 grid max-w-3xl gap-3 text-sm sm:grid-cols-3">
        <Entry label="Origine" value={contractSourceLabels[source]?.fr ?? source} />
        <Entry label="Envoyé le" value={formatDate(doc.sentAt)} />
        <Entry label="Achevé le" value={formatDate(doc.completedAt)} />
        <Entry label="Expire le" value={formatDate(doc.expiresAt)} />
        <Entry label="Langue" value={String(doc.locale) === "en" ? "English" : "Français"} />
        <Entry label="Signataires" value={String(signers.length)} />
      </dl>

      {hash ? (
        <section className="mt-6 max-w-3xl rounded-lg border border-border bg-[var(--plate)] p-4">
          <h2 className="text-xs text-muted-foreground">Empreinte SHA-256 du document présenté</h2>
          <p className="mt-1 break-all font-mono text-xs">{hash}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Figée à l&apos;envoi. C&apos;est elle qui permet de démontrer que le document signé dérive
            bien de celui que les parties ont lu.
          </p>
        </section>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <ContractEditor
            initial={{
              id,
              title: String(doc.title ?? ""),
              source,
              body: String(doc.body ?? ""),
              sourceFileId: String(doc.sourceFileId ?? ""),
              sourceFileName: String(sourceFile?.originalFilename ?? sourceFile?.filename ?? ""),
              clientId: String(doc.clientId ?? ""),
              message: String(doc.message ?? ""),
              locale: String(doc.locale) === "en" ? "en" : "fr",
              expiresAt: doc.expiresAt instanceof Date ? doc.expiresAt.toISOString().slice(0, 10) : "",
              signers:
                signers.length > 0
                  ? signers.map((signer) => ({
                      name: String(signer.name ?? ""),
                      email: String(signer.email ?? ""),
                      role: String(signer.role ?? ""),
                      order: String(signer.order ?? 0),
                    }))
                  : [{ name: "", email: "", role: "", order: "0" }],
              status,
            }}
          />

          {status !== "draft" && source === "generated" ? (
            <section className="mt-10 grid gap-3 rounded-lg border border-border p-5">
              <h2 className="font-heading text-lg">Texte envoyé</h2>
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs text-muted-foreground">
                {String(doc.body ?? "")}
              </pre>
            </section>
          ) : null}
        </div>

        <div className="grid gap-8">
          <ContractActions
            contractId={id}
            status={status}
            signerCount={signers.length}
            pendingCount={pending.length}
          />

          <section className="grid gap-3 rounded-lg border border-border p-5">
            <h2 className="font-heading text-lg">Piste d&apos;audit</h2>
            <ul className="divide-y divide-border text-sm">
              {signers.map((signer) => {
                const signerStatus = String(signer.status ?? "pending") as SignerStatus;
                const mode = String(signer.mode ?? "typed") as SignatureMode;
                return (
                  <li key={String(signer._id)} className="grid gap-1 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">{String(signer.name ?? "")}</span>
                      <Badge variant={signerStatus === "signed" ? "default" : signerStatus === "declined" ? "destructive" : "outline"}>
                        {signerStatusLabels[signerStatus]?.fr ?? signerStatus}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{String(signer.email ?? "")}</span>
                    {signer.role ? (
                      <span className="text-xs text-muted-foreground">{String(signer.role)}</span>
                    ) : null}
                    {Number(signer.order ?? 0) > 0 ? (
                      <span className="text-xs text-muted-foreground">Rang {String(signer.order)}</span>
                    ) : null}
                    {signer.viewedAt ? (
                      <span className="text-xs text-muted-foreground">
                        Consulté le {formatDate(signer.viewedAt)}
                      </span>
                    ) : null}
                    {signer.signedAt ? (
                      <span className="text-xs text-muted-foreground">
                        Signé le {formatDate(signer.signedAt)} · {signatureModeLabels[mode]?.fr ?? mode}
                        {signer.ip ? ` · ${String(signer.ip)}` : ""}
                      </span>
                    ) : null}
                    {signer.declinedAt ? (
                      <span className="text-xs text-destructive">
                        Refusé le {formatDate(signer.declinedAt)}
                        {signer.declineReason ? ` — ${String(signer.declineReason)}` : ""}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

function Entry({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
