"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currencies } from "@/lib/platform/enums";
import { computeInvoice } from "@/lib/platform/invoices";
import { formatMoney, parseAmountToMinor } from "@/lib/platform/money";

export type InvoiceLine = { name: string; description: string; quantity: string; unitPrice: string };
export type InvoiceTax = { label: string; ratePercent: string; registration: string };

export type InvoiceDraft = {
  id?: string;
  clientId: string;
  billTo: { name: string; email: string; company: string; address: string };
  currency: string;
  locale: "fr" | "en";
  items: InvoiceLine[];
  discount: string;
  taxes: InvoiceTax[];
  dueAt: string;
  notes: string;
  terms: string;
  status: string;
};

/**
 * Rédaction d'une facture.
 *
 * Le total affiché ici est un **aperçu**, calculé par la même fonction que le
 * serveur. C'est le serveur qui recalcule et enregistre : une requête forgée
 * annonçant un total différent n'aurait aucun effet. Afficher le même résultat
 * des deux côtés évite seulement à l'administrateur d'émettre à l'aveugle.
 *
 * Les taux se saisissent en pourcentage — c'est ainsi qu'on les connaît — et
 * sont convertis en parties par million avant l'envoi.
 */
export function InvoiceEditor({ initial }: { initial: InvoiceDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<InvoiceDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const editable = draft.status === "draft";

  const set = <K extends keyof InvoiceDraft>(key: K) => (value: InvoiceDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const setLine = (index: number, patch: Partial<InvoiceLine>) =>
    setDraft((current) => ({
      ...current,
      items: current.items.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));

  const setTax = (index: number, patch: Partial<InvoiceTax>) =>
    setDraft((current) => ({
      ...current,
      taxes: current.taxes.map((tax, i) => (i === index ? { ...tax, ...patch } : tax)),
    }));

  /** Aperçu des totaux — même arithmétique que le serveur. */
  const preview = useMemo(() => {
    const items = draft.items.map((line) => ({
      quantity: Number(line.quantity) || 0,
      unitPrice: parseAmountToMinor(line.unitPrice) ?? 0,
    }));
    const taxes = draft.taxes
      .filter((tax) => tax.label.trim())
      .map((tax) => ({
        label: tax.label,
        ratePpm: Math.round((Number(tax.ratePercent) || 0) * 10_000),
        registration: tax.registration,
      }));
    return computeInvoice(items, parseAmountToMinor(draft.discount) ?? 0, taxes);
  }, [draft.items, draft.discount, draft.taxes]);

  const money = (minor: number) => formatMoney(minor, draft.currency, "fr");

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");

    const payload = {
      clientId: draft.clientId,
      billTo: draft.billTo,
      currency: draft.currency,
      locale: draft.locale,
      items: draft.items.map((line) => ({
        name: line.name,
        description: line.description,
        quantity: Number(line.quantity) || 0,
        unitPrice: line.unitPrice,
      })),
      discount: draft.discount,
      taxes: draft.taxes
        .filter((tax) => tax.label.trim())
        .map((tax) => ({
          label: tax.label,
          ratePpm: Math.round((Number(tax.ratePercent) || 0) * 10_000),
          registration: tax.registration,
        })),
      dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : "",
      notes: draft.notes,
      terms: draft.terms,
    };

    const response = await fetch(
      draft.id ? `/api/admin/invoices/${draft.id}` : "/api/admin/invoices",
      {
        method: draft.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    ).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : "L'enregistrement a échoué.");
      return;
    }

    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    if (!draft.id && body?.id) {
      router.replace(`/admin/factures/${body.id}`);
      return;
    }
    setMessage("Facture enregistrée.");
    router.refresh();
  }

  if (!editable) {
    return (
      <p className="rounded-lg border border-border bg-[var(--plate)] p-4 text-sm text-muted-foreground">
        Cette facture est émise : ses montants ne sont plus modifiables. Pour corriger, annulez-la et
        réémettez-en une — la séquence comptable doit rester continue.
      </p>
    );
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-4 rounded-lg border border-border p-5">
        <h2 className="font-heading text-lg">Destinataire</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Organisation" value={draft.billTo.company} onChange={(v) => set("billTo")({ ...draft.billTo, company: v })} />
          <Field label="Nom" value={draft.billTo.name} onChange={(v) => set("billTo")({ ...draft.billTo, name: v })} />
          <Field label="Courriel" type="email" value={draft.billTo.email} onChange={(v) => set("billTo")({ ...draft.billTo, email: v })} />
          <div className="grid gap-1.5">
            <Label htmlFor="bill-address">Adresse</Label>
            <Textarea id="bill-address" rows={3} value={draft.billTo.address} onChange={(e) => set("billTo")({ ...draft.billTo, address: e.target.value })} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ces coordonnées sont figées dans la facture à l&apos;émission : un changement d&apos;adresse
          ultérieur ne réécrit pas un document déjà remis.
        </p>
      </section>

      <section className="grid gap-4 rounded-lg border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg">Lignes</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setDraft((c) => ({ ...c, items: [...c.items, { name: "", description: "", quantity: "1", unitPrice: "0" }] }))
            }
          >
            Ajouter une ligne
          </Button>
        </div>

        {draft.items.map((line, index) => (
          <div key={index} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <div className="grid gap-2">
              <Field label="Intitulé" value={line.name} onChange={(v) => setLine(index, { name: v })} />
              <Textarea rows={2} placeholder="Description (facultatif)" value={line.description} onChange={(e) => setLine(index, { description: e.target.value })} />
            </div>
            <Field label="Quantité" type="number" value={line.quantity} onChange={(v) => setLine(index, { quantity: v })} />
            <Field label="Prix unitaire" value={line.unitPrice} onChange={(v) => setLine(index, { unitPrice: v })} />
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={draft.items.length <= 1}
                onClick={() => setDraft((c) => ({ ...c, items: c.items.filter((_, i) => i !== index) }))}
              >
                Retirer
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 rounded-lg border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg">Taxes</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setDraft((c) => ({ ...c, taxes: [...c.taxes, { label: "", ratePercent: "0", registration: "" }] }))}
          >
            Ajouter une taxe
          </Button>
        </div>

        {draft.taxes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune taxe. Les taxes par défaut des réglages de facturation seront appliquées.
          </p>
        ) : null}

        {draft.taxes.map((tax, index) => (
          <div key={index} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_1fr_1.5fr_auto]">
            <Field label="Libellé" value={tax.label} onChange={(v) => setTax(index, { label: v })} />
            <Field label="Taux (%)" value={tax.ratePercent} onChange={(v) => setTax(index, { ratePercent: v })} />
            <Field label="Numéro d'inscription" value={tax.registration} onChange={(v) => setTax(index, { registration: v })} />
            <div className="flex items-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setDraft((c) => ({ ...c, taxes: c.taxes.filter((_, i) => i !== index) }))}>
                Retirer
              </Button>
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground">
          Les taxes s&apos;appliquent en parallèle sur le montant après remise, jamais en cascade.
        </p>
      </section>

      <section className="grid gap-4 rounded-lg border border-border p-5 sm:grid-cols-2">
        <Field label="Remise" value={draft.discount} onChange={set("discount")} />
        <Field label="Échéance" type="date" value={draft.dueAt} onChange={set("dueAt")} />
        <div className="grid gap-1.5">
          <Label htmlFor="currency">Devise</Label>
          <select
            id="currency"
            value={draft.currency}
            onChange={(e) => set("currency")(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            {currencies.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="locale">Langue du document</Label>
          <select
            id="locale"
            value={draft.locale}
            onChange={(e) => set("locale")(e.target.value as "fr" | "en")}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} value={draft.notes} onChange={(e) => set("notes")(e.target.value)} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="terms">Conditions</Label>
          <Textarea id="terms" rows={3} value={draft.terms} onChange={(e) => set("terms")(e.target.value)} />
        </div>
      </section>

      <section className="grid gap-1.5 rounded-lg border border-border bg-[var(--plate)] p-5 text-sm">
        <Line label="Sous-total" value={money(preview.subtotal)} />
        {preview.discount > 0 ? <Line label="Remise" value={`- ${money(preview.discount)}`} /> : null}
        {preview.taxes.map((tax, index) => (
          <Line key={index} label={`${tax.label} (${(tax.ratePpm / 10_000).toLocaleString("fr-CA")} %)`} value={money(tax.amount)} />
        ))}
        <Line label="Total" value={money(preview.total)} strong />
        <p className="mt-2 text-xs text-muted-foreground">
          Aperçu. Le serveur recalcule et fait foi.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={busy} onClick={save}>
          {busy ? "Enregistrement…" : "Enregistrer le brouillon"}
        </Button>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-6 ${strong ? "border-t border-border pt-2 font-medium" : ""}`}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
