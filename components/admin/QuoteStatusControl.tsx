"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  quotePriorities,
  quotePriorityLabels,
  quoteStatusLabels,
  quoteTransitions,
  type QuoteStatus,
} from "@/lib/platform/enums";

/**
 * Pilotage d'un dossier.
 *
 * La liste des états proposés vient de la **machine à états** : seuls les
 * enchaînements réellement possibles depuis l'état courant apparaissent. Le
 * serveur les revérifie de toute façon — l'interface ne fait que ne pas
 * proposer l'impossible.
 *
 * Le message facultatif part dans la conversation du dossier : c'est ainsi
 * qu'une demande d'information arrive au client, et pas seulement dans un
 * statut qu'il devrait deviner.
 */
export function QuoteStatusControl({
  quoteId,
  status,
  priority,
  canMessage,
}: {
  quoteId: string;
  status: QuoteStatus;
  priority: string;
  /** Faux tant que la demande n'est rattachée à aucun compte. */
  canMessage: boolean;
}) {
  const router = useRouter();
  const allowed = quoteTransitions[status] ?? [];

  const [next, setNext] = useState<string>(allowed[0] ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function apply() {
    if (!next) return;
    setBusy(true);
    setError("");
    setNotice("");

    const response = await fetch(`/api/admin/quotes/${quoteId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next, message }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "Le changement de statut a échoué.");
      return;
    }

    setMessage("");
    setNotice("Statut mis à jour. Le client a été prévenu.");
    router.refresh();
  }

  async function setPriority(value: string) {
    await fetch(`/api/admin/quotes/${quoteId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ priority: value }),
    }).catch(() => null);
    router.refresh();
  }

  return (
    <section className="grid gap-4 rounded-lg border border-border p-5">
      <h2 className="font-heading text-lg">Statut</h2>

      {allowed.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ce dossier est clos : {quoteStatusLabels[status]?.fr ?? status}. Son historique ne se réécrit pas.
        </p>
      ) : (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="quote-next-status">Faire passer à</Label>
            <select
              id="quote-next-status"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              {allowed.map((value) => (
                <option key={value} value={value}>
                  {quoteStatusLabels[value].fr}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="quote-status-message">Message au client (facultatif)</Label>
            <Textarea
              id="quote-status-message"
              rows={4}
              value={message}
              disabled={!canMessage}
              onChange={(event) => setMessage(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {canMessage
                ? "Publié dans la conversation du dossier et signalé au client."
                : "Indisponible : cette demande n'est rattachée à aucun compte client."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={apply} disabled={busy || !next}>
              {busy ? "Mise à jour…" : "Appliquer"}
            </Button>
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
        </>
      )}

      <div className="grid gap-1.5 border-t border-border pt-4">
        <Label htmlFor="quote-priority">Priorité (interne)</Label>
        <select
          id="quote-priority"
          defaultValue={priority}
          onChange={(event) => setPriority(event.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          {quotePriorities.map((value) => (
            <option key={value} value={value}>
              {quotePriorityLabels[value].fr}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">Jamais visible du client.</p>
      </div>
    </section>
  );
}
