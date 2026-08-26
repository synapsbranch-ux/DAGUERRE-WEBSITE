"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * Ouverture d'une conversation par le client.
 *
 * Repliée par défaut : la boîte de réception doit d'abord montrer les échanges
 * en cours. Un objet et un premier message suffisent — le rattachement à un
 * dossier se fait depuis la fiche du devis concerné, où le contexte est déjà
 * établi.
 */
export function NewConversation({ dict }: { dict: Dictionary }) {
  const t = dict.platform.messages;
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const response = await fetch("/api/client/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject, body, context: "general" }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || dict.platform.common.error);
      return;
    }

    setSubject("");
    setBody("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" className="w-fit" onClick={() => setOpen(true)}>
        {t.newConversation}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg border border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg">{t.newConversation}</h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {dict.platform.common.close}
        </Button>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="conversation-subject">{t.subject}</Label>
        <Input
          id="conversation-subject"
          required
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="conversation-body">{t.message}</Label>
        <Textarea
          id="conversation-body"
          required
          rows={5}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button disabled={busy || !subject.trim() || !body.trim()}>
          {busy ? dict.platform.common.sending : t.send}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
