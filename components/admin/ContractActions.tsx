"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * Envoi, relance et annulation d'un contrat.
 *
 * Chaque bouton dit sa conséquence **avant** le clic. L'envoi fige l'empreinte
 * du document et ouvre la signature ; la réémission tue les liens déjà partis ;
 * l'annulation ferme le document sans effacer les signatures déjà apposées.
 * Aucune de ces trois actions ne se défait.
 */
export function ContractActions({
  contractId,
  status,
  signerCount,
  pendingCount,
}: {
  contractId: string;
  status: string;
  signerCount: number;
  pendingCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function call(path: string) {
    setBusy(true);
    setError("");
    setNotice("");

    const response = await fetch(path, { method: "POST" }).catch(() => null);
    setBusy(false);

    const payload = (await response?.json().catch(() => null)) as { error?: unknown } | null;

    if (!response?.ok) {
      setError(typeof payload?.error === "string" ? payload.error : "L'opération a échoué.");
      return;
    }

    // Une réussite peut s'accompagner d'un envoi manqué : le contrat est parti,
    // et l'administrateur doit savoir qui n'a pas été joint.
    if (typeof payload?.error === "string") setNotice(payload.error);
    router.refresh();
  }

  const open = status === "sent" || status === "partially_signed";

  return (
    <div className="grid gap-6">
      {status === "draft" ? (
        <section className="grid gap-3 rounded-lg border border-border p-5">
          <h2 className="font-heading text-lg">Envoyer en signature</h2>
          <p className="text-sm text-muted-foreground">
            Le document est produit une fois, son empreinte SHA-256 est figée, et chaque partie reçoit
            son lien personnel. Le contrat n&apos;est plus modifiable ensuite.
          </p>
          {signerCount === 0 ? (
            <p className="text-sm text-destructive">Ajoutez au moins un signataire.</p>
          ) : null}
          <div>
            <Button
              type="button"
              disabled={busy || signerCount === 0}
              onClick={() => call(`/api/admin/contracts/${contractId}/send`)}
            >
              {busy ? "Envoi…" : "Envoyer en signature"}
            </Button>
          </div>
        </section>
      ) : null}

      {open ? (
        <section className="grid gap-3 rounded-lg border border-border p-5">
          <h2 className="font-heading text-lg">Relancer ou révoquer</h2>
          <p className="text-sm text-muted-foreground">
            Un nouveau lien part vers les parties qui n&apos;ont pas encore répondu. Les liens déjà
            envoyés cessent immédiatement de fonctionner — c&apos;est aussi ainsi qu&apos;on révoque un
            lien parti à la mauvaise adresse.
          </p>
          {pendingCount === 0 ? (
            <p className="text-sm text-muted-foreground">Toutes les parties ont répondu.</p>
          ) : null}
          <div>
            <Button
              type="button"
              variant="secondary"
              disabled={busy || pendingCount === 0}
              onClick={() => call(`/api/admin/contracts/${contractId}/reissue`)}
            >
              Réémettre les liens ({pendingCount})
            </Button>
          </div>
        </section>
      ) : null}

      {status !== "signed" && status !== "cancelled" ? (
        <section className="grid gap-3 rounded-lg border border-border p-5">
          <h2 className="font-heading text-lg">Annuler</h2>
          <p className="text-sm text-muted-foreground">
            Les liens cessent d&apos;aboutir. Les signatures déjà apposées restent consignées : elles
            ont eu lieu, et la piste d&apos;audit ne se réécrit pas.
          </p>
          <div>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => call(`/api/admin/contracts/${contractId}`)}
            >
              Annuler le contrat
            </Button>
          </div>
        </section>
      ) : null}

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </div>
  );
}
