"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { paymentMethodLabels, paymentMethods } from "@/lib/platform/enums";

/**
 * Émission et encaissements.
 *
 * L'émission est irréversible : elle attribue une date, produit le PDF définitif
 * et l'envoie. Le bouton le dit avant le clic plutôt qu'après.
 */
export function InvoiceActions({
  invoiceId,
  status,
  canSend,
}: {
  invoiceId: string;
  status: string;
  canSend: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  async function call(path: string, body?: unknown) {
    setBusy(true);
    setError("");
    setNotice("");

    const response = await fetch(path, {
      method: "POST",
      ...(body === undefined
        ? {}
        : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    }).catch(() => null);

    setBusy(false);

    const payload = (await response?.json().catch(() => null)) as
      | { error?: unknown; emailed?: boolean }
      | null;

    if (!response?.ok) {
      setError(typeof payload?.error === "string" ? payload.error : "L'opération a échoué.");
      return false;
    }

    // L'émission peut réussir sans que le courriel parte : la facture existe
    // quand même, et l'administrateur doit le savoir pour la transmettre.
    if (typeof payload?.error === "string") setNotice(payload.error);
    router.refresh();
    return true;
  }

  return (
    <div className="grid gap-6">
      {status === "draft" ? (
        <section className="grid gap-3 rounded-lg border border-border p-5">
          <h2 className="font-heading text-lg">Émettre</h2>
          <p className="text-sm text-muted-foreground">
            L&apos;émission attribue la date, produit le PDF définitif et l&apos;envoie au destinataire.
            Elle est irréversible : une facture émise s&apos;annule, elle ne redevient pas brouillon.
          </p>
          {!canSend ? (
            <p className="text-sm text-destructive">
              Renseignez une adresse de facturation avant d&apos;émettre.
            </p>
          ) : null}
          <div>
            <Button
              type="button"
              disabled={busy || !canSend}
              onClick={() => call(`/api/admin/invoices/${invoiceId}/send`)}
            >
              {busy ? "Émission…" : "Émettre et envoyer"}
            </Button>
          </div>
        </section>
      ) : null}

      {status !== "draft" && status !== "cancelled" && status !== "paid" ? (
        <section className="grid gap-3 rounded-lg border border-border p-5">
          <h2 className="font-heading text-lg">Enregistrer un paiement</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pay-amount">Montant</Label>
              <Input id="pay-amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-method">Moyen</Label>
              <select
                id="pay-method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {paymentMethods.map((value) => (
                  <option key={value} value={value}>
                    {paymentMethodLabels[value].fr}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-ref">Référence</Label>
              <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="pay-note">Note</Label>
              <Textarea id="pay-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <div>
            <Button
              type="button"
              disabled={busy || !amount.trim()}
              onClick={async () => {
                const ok = await call(`/api/admin/invoices/${invoiceId}/payments`, {
                  amount,
                  method,
                  reference,
                  note,
                });
                if (ok) {
                  setAmount("");
                  setReference("");
                  setNote("");
                }
              }}
            >
              Enregistrer le paiement
            </Button>
          </div>
        </section>
      ) : null}

      {status !== "cancelled" && status !== "paid" ? (
        <section className="grid gap-3 rounded-lg border border-border p-5">
          <h2 className="font-heading text-lg">Annuler</h2>
          <p className="text-sm text-muted-foreground">
            La facture reste dans l&apos;historique et son numéro n&apos;est jamais réattribué : la
            séquence comptable doit rester continue.
          </p>
          <div>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={() => call(`/api/admin/invoices/${invoiceId}`)}
            >
              Annuler la facture
            </Button>
          </div>
        </section>
      ) : null}

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
    </div>
  );
}
