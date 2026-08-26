"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type QuoteNote = { id: string; authorName: string; body: string; createdAt: string };

/**
 * Notes internes d'un dossier.
 *
 * Elles vivent dans une collection distincte des messages, qu'aucune requête
 * de l'espace client n'interroge. La distinction n'est pas visuelle : ce n'est
 * pas un style ni un booléen qui protège ces notes, c'est le fait qu'elles ne
 * soient jamais lues par le code qui sert le client.
 */
export function QuoteNotes({ quoteId, notes }: { quoteId: string; notes: QuoteNote[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;

    setBusy(true);
    setError("");

    const response = await fetch(`/api/admin/quotes/${quoteId}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      setError("La note n'a pas pu être enregistrée.");
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <section className="grid gap-4 rounded-lg border border-border p-5">
      <div>
        <h2 className="font-heading text-lg">Notes internes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Visibles de l&apos;administration seulement. Elles ne sont jamais transmises au client.
        </p>
      </div>

      {notes.length > 0 ? (
        <ul className="grid gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-md border border-border bg-[var(--plate)] p-3">
              <p className="text-xs text-muted-foreground">
                {note.authorName || "Administration"} · {note.createdAt}
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm">{note.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Aucune note pour ce dossier.</p>
      )}

      <form onSubmit={submit} className="grid gap-2">
        <Label htmlFor="quote-note">Ajouter une note</Label>
        <Textarea
          id="quote-note"
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
        <div className="flex items-center gap-3">
          <Button size="sm" disabled={busy || !body.trim()}>
            {busy ? "Enregistrement…" : "Ajouter"}
          </Button>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
