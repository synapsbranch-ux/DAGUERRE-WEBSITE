"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currencies } from "@/lib/platform/enums";
import { formatMoney, minorToInput, parseAmountToMinor } from "@/lib/platform/money";

type Item = { name: string; description: string; quantity: string; unitPrice: string };

export type ProposalDraft = {
  id?: string;
  version?: number;
  status?: string;
  title: string;
  summary: string;
  currency: string;
  items: Item[];
  discount: string;
  tax: string;
  validUntil: string;
  terms: string;
};

export const emptyProposal: ProposalDraft = {
  title: "",
  summary: "",
  currency: "CAD",
  items: [{ name: "", description: "", quantity: "1", unitPrice: "0" }],
  discount: "0",
  tax: "0",
  validUntil: "",
  terms: "",
};

/**
 * Constructeur de devis.
 *
 * Les lignes sont **structurées** — libellé, description, quantité, prix
 * unitaire — plutôt qu'un bloc de texte libre : c'est ce qui permet d'afficher
 * un tableau au client, de recalculer un total fiable et de reprendre une
 * version précédente.
 *
 * Le total affiché ici n'est qu'un aperçu de saisie. Celui qui est enregistré
 * est recalculé côté serveur à partir des lignes : le navigateur ne décide
 * jamais d'un montant.
 *
 * Enregistrer et transmettre sont deux gestes distincts. On rédige, on relit,
 * puis on envoie — jamais par effet de bord d'une sauvegarde.
 */
export function ProposalBuilder({
  quoteId,
  initial,
  disabledReason,
}: {
  quoteId: string;
  initial?: ProposalDraft;
  /** Raison bloquant toute nouvelle proposition (offre déjà acceptée…). */
  disabledReason?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ProposalDraft>(initial ?? emptyProposal);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const editable = !draft.status || draft.status === "draft";

  const set =
    <K extends keyof ProposalDraft>(key: K) =>
    (value: ProposalDraft[K]) =>
      setDraft((current) => ({ ...current, [key]: value }));

  const setItem = (index: number, patch: Partial<Item>) =>
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, position) => (position === index ? { ...item, ...patch } : item)),
    }));

  // Aperçu local : mêmes règles que le serveur, mais sans autorité.
  const amounts = draft.items.map((item) => {
    const unit = parseAmountToMinor(item.unitPrice) ?? 0;
    const quantity = Number(item.quantity) || 0;
    return Math.round(unit * quantity);
  });
  const subtotal = amounts.reduce((sum, amount) => sum + amount, 0);
  const discount = parseAmountToMinor(draft.discount) ?? 0;
  const tax = parseAmountToMinor(draft.tax) ?? 0;
  const total = Math.max(0, subtotal - discount) + tax;

  const payload = () => ({
    title: draft.title,
    summary: draft.summary,
    currency: draft.currency,
    items: draft.items
      .filter((item) => item.name.trim())
      .map((item) => ({
        name: item.name,
        description: item.description,
        quantity: Number(item.quantity) || 0,
        unitPrice: item.unitPrice,
      })),
    discount: draft.discount,
    tax: draft.tax,
    validUntil: draft.validUntil,
    terms: draft.terms,
  });

  async function save() {
    setBusy(true);
    setError("");
    setNotice("");

    const endpoint = draft.id
      ? `/api/admin/quotes/${quoteId}/proposals/${draft.id}`
      : `/api/admin/quotes/${quoteId}/proposals`;

    const response = await fetch(endpoint, {
      method: draft.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : "L'enregistrement a échoué.");
      return;
    }

    setNotice("Brouillon enregistré. Il n'a pas été transmis.");
    router.refresh();
  }

  async function send() {
    if (!draft.id) return;
    setBusy(true);
    setError("");

    const response = await fetch(`/api/admin/quotes/${quoteId}/proposals/${draft.id}/send`, {
      method: "POST",
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "L'envoi a échoué.");
      return;
    }

    setNotice("Devis transmis au client.");
    router.refresh();
  }

  if (disabledReason) {
    return (
      <section className="rounded-lg border border-border p-5">
        <h2 className="font-heading text-lg">Devis</h2>
        <p className="mt-2 text-sm text-muted-foreground">{disabledReason}</p>
      </section>
    );
  }

  const money = (value: number) => formatMoney(value, draft.currency, "fr");

  return (
    <section className="grid gap-5 rounded-lg border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-lg">
          {draft.id ? `Devis v${draft.version ?? 1}` : "Nouveau devis"}
        </h2>
        {draft.status && draft.status !== "draft" ? (
          <p className="text-sm text-muted-foreground">
            Transmis : cette version n&apos;est plus modifiable.
          </p>
        ) : null}
      </div>

      <fieldset disabled={!editable} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="proposal-title">Titre</Label>
          <Input
            id="proposal-title"
            value={draft.title}
            onChange={(event) => set("title")(event.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="proposal-summary">Résumé</Label>
          <Textarea
            id="proposal-summary"
            rows={3}
            value={draft.summary}
            onChange={(event) => set("summary")(event.target.value)}
          />
        </div>

        <div className="grid gap-3">
          <p className="text-sm font-medium">Lignes</p>
          {draft.items.map((item, index) => (
            <div key={index} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,1fr)_90px_130px_auto]">
              <div className="grid gap-1.5">
                <Label htmlFor={`item-name-${index}`}>Libellé</Label>
                <Input
                  id={`item-name-${index}`}
                  value={item.name}
                  onChange={(event) => setItem(index, { name: event.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`item-qty-${index}`}>Qté</Label>
                <Input
                  id={`item-qty-${index}`}
                  inputMode="decimal"
                  value={item.quantity}
                  onChange={(event) => setItem(index, { quantity: event.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`item-price-${index}`}>Prix unitaire</Label>
                <Input
                  id={`item-price-${index}`}
                  inputMode="decimal"
                  value={item.unitPrice}
                  onChange={(event) => setItem(index, { unitPrice: event.target.value })}
                />
              </div>
              <div className="flex items-end justify-between gap-2 sm:flex-col sm:items-end">
                <span className="text-sm tabular-nums">{money(amounts[index] ?? 0)}</span>
                {draft.items.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        items: current.items.filter((_, position) => position !== index),
                      }))
                    }
                  >
                    Retirer
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-1.5 sm:col-span-4">
                <Label htmlFor={`item-desc-${index}`}>Description</Label>
                <Textarea
                  id={`item-desc-${index}`}
                  rows={2}
                  value={item.description}
                  onChange={(event) => setItem(index, { description: event.target.value })}
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-fit"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                items: [...current.items, { name: "", description: "", quantity: "1", unitPrice: "0" }],
              }))
            }
          >
            Ajouter une ligne
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor="proposal-currency">Devise</Label>
            <select
              id="proposal-currency"
              value={draft.currency}
              onChange={(event) => set("currency")(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              {currencies.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="proposal-discount">Remise</Label>
            <Input
              id="proposal-discount"
              inputMode="decimal"
              value={draft.discount}
              onChange={(event) => set("discount")(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="proposal-tax">Taxes</Label>
            <Input
              id="proposal-tax"
              inputMode="decimal"
              value={draft.tax}
              onChange={(event) => set("tax")(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="proposal-valid">Valable jusqu&apos;au</Label>
            <Input
              id="proposal-valid"
              type="date"
              value={draft.validUntil}
              onChange={(event) => set("validUntil")(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="proposal-terms">Conditions</Label>
          <Textarea
            id="proposal-terms"
            rows={4}
            value={draft.terms}
            onChange={(event) => set("terms")(event.target.value)}
          />
        </div>
      </fieldset>

      <dl className="grid gap-1 border-t border-border pt-4 text-sm">
        <div className="flex justify-between gap-6">
          <dt className="text-muted-foreground">Sous-total</dt>
          <dd className="tabular-nums">{money(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-6 border-t border-border pt-1 font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{money(total)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        {editable ? (
          <Button type="button" onClick={save} disabled={busy || !draft.title.trim()}>
            {busy ? "Enregistrement…" : "Enregistrer le brouillon"}
          </Button>
        ) : null}

        {editable && draft.id ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="secondary">
                Transmettre au client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transmettre ce devis ?</DialogTitle>
                <DialogDescription>
                  Le client recevra un courriel et pourra accepter ou refuser. Une proposition transmise
                  n&apos;est plus modifiable : une révision passe par une nouvelle version.
                </DialogDescription>
              </DialogHeader>
              <dl className="grid gap-2 rounded-lg border border-border p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Titre</dt>
                  <dd className="text-right font-medium">{draft.title}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="text-right font-medium">{money(total)}</dd>
                </div>
              </dl>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Annuler
                  </Button>
                </DialogClose>
                <Button type="button" onClick={send} disabled={busy}>
                  Transmettre
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}

        {notice ? (
          <p role="status" className="text-sm text-muted-foreground">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Convertit une proposition enregistrée en brouillon éditable. */
export function toDraft(proposal: {
  id: string;
  version: number;
  status: string;
  title: string;
  summary: string;
  currency: string;
  items: { name: string; description: string; quantity: number; unitPrice: number }[];
  discount: number;
  tax: number;
  validUntil: string;
  terms: string;
}): ProposalDraft {
  return {
    id: proposal.id,
    version: proposal.version,
    status: proposal.status,
    title: proposal.title,
    summary: proposal.summary,
    currency: proposal.currency,
    items: proposal.items.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: minorToInput(item.unitPrice),
    })),
    discount: minorToInput(proposal.discount),
    tax: minorToInput(proposal.tax),
    validUntil: proposal.validUntil ? proposal.validUntil.slice(0, 10) : "",
    terms: proposal.terms,
  };
}
