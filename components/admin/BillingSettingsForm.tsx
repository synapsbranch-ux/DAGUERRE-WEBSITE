"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currencies } from "@/lib/platform/enums";

export type BillingTaxDraft = { label: string; ratePercent: string; registration: string };

export type BillingDraft = {
  legalName: string;
  address: string;
  email: string;
  phone: string;
  defaultCurrency: string;
  paymentTermsDays: string;
  taxes: BillingTaxDraft[];
  defaultTerms: string;
  defaultNotes: string;
};

/**
 * Identité fiscale et valeurs par défaut.
 *
 * Ce qu'on enregistre ici **préremplit** les nouvelles factures. Une facture
 * déjà émise porte sa propre copie : modifier un taux n'en réécrit aucune.
 *
 * Les taux se saisissent en pourcentage et sont convertis en parties par
 * million avant l'envoi — 9,975 % devient 99 750, un entier.
 */
export function BillingSettingsForm({ initial }: { initial: BillingDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<BillingDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const set = <K extends keyof BillingDraft>(key: K) => (value: BillingDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/billing-settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...draft,
        paymentTermsDays: Number(draft.paymentTermsDays) || 0,
        taxes: draft.taxes
          .filter((tax) => tax.label.trim())
          .map((tax) => ({
            label: tax.label,
            ratePpm: Math.round((Number(tax.ratePercent) || 0) * 10_000),
            registration: tax.registration,
          })),
      }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : "L'enregistrement a échoué.");
      return;
    }

    setMessage("Réglages enregistrés.");
    router.refresh();
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-4 rounded-lg border border-border p-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="legal">Raison sociale</Label>
          <Input id="legal" value={draft.legalName} onChange={(e) => set("legalName")(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bemail">Courriel de facturation</Label>
          <Input id="bemail" type="email" value={draft.email} onChange={(e) => set("email")(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bphone">Téléphone</Label>
          <Input id="bphone" value={draft.phone} onChange={(e) => set("phone")(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="terms-days">Délai de paiement (jours)</Label>
          <Input id="terms-days" type="number" value={draft.paymentTermsDays} onChange={(e) => set("paymentTermsDays")(e.target.value)} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="baddress">Adresse</Label>
          <Textarea id="baddress" rows={3} value={draft.address} onChange={(e) => set("address")(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bcurrency">Devise par défaut</Label>
          <select
            id="bcurrency"
            value={draft.defaultCurrency}
            onChange={(e) => set("defaultCurrency")(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            {currencies.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-lg">Taxes par défaut</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setDraft((c) => ({ ...c, taxes: [...c.taxes, { label: "", ratePercent: "0", registration: "" }] }))}
          >
            Ajouter
          </Button>
        </div>

        {draft.taxes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune taxe configurée. Les factures seront émises hors taxes.
          </p>
        ) : null}

        {draft.taxes.map((tax, index) => (
          <div key={index} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_1fr_1.5fr_auto]">
            <div className="grid gap-1.5">
              <Label>Libellé</Label>
              <Input
                value={tax.label}
                placeholder="TPS"
                onChange={(e) =>
                  setDraft((c) => ({ ...c, taxes: c.taxes.map((t, i) => (i === index ? { ...t, label: e.target.value } : t)) }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Taux (%)</Label>
              <Input
                value={tax.ratePercent}
                placeholder="9.975"
                onChange={(e) =>
                  setDraft((c) => ({ ...c, taxes: c.taxes.map((t, i) => (i === index ? { ...t, ratePercent: e.target.value } : t)) }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Numéro d&apos;inscription</Label>
              <Input
                value={tax.registration}
                onChange={(e) =>
                  setDraft((c) => ({ ...c, taxes: c.taxes.map((t, i) => (i === index ? { ...t, registration: e.target.value } : t)) }))
                }
              />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="ghost" size="sm" onClick={() => setDraft((c) => ({ ...c, taxes: c.taxes.filter((_, i) => i !== index) }))}>
                Retirer
              </Button>
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground">
          Les décimales sont acceptées : la TVQ s&apos;écrit 9.975. Les taxes s&apos;appliquent en
          parallèle sur le montant après remise, jamais en cascade.
        </p>
      </section>

      <section className="grid gap-4 rounded-lg border border-border p-5">
        <div className="grid gap-1.5">
          <Label htmlFor="dterms">Conditions par défaut</Label>
          <Textarea id="dterms" rows={3} value={draft.defaultTerms} onChange={(e) => set("defaultTerms")(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dnotes">Notes par défaut</Label>
          <Textarea id="dnotes" rows={3} value={draft.defaultNotes} onChange={(e) => set("defaultNotes")(e.target.value)} />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={busy} onClick={save}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}
