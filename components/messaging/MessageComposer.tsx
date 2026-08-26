"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Zone de rédaction d'un message.
 *
 * Le même composant sert le client et l'administration ; seul le point
 * d'entrée change, et c'est lui qui décide des droits. Le texte part tel
 * quel : aucune mise en forme n'est interprétée, ni à l'écriture ni à
 * l'affichage.
 */
export function MessageComposer({
  endpoint,
  label,
  sendLabel,
  sendingLabel,
  errorLabel,
  disabled,
  disabledLabel,
}: {
  endpoint: string;
  label: string;
  sendLabel: string;
  sendingLabel: string;
  errorLabel: string;
  disabled?: boolean;
  disabledLabel?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (disabled) {
    return <p className="text-sm text-muted-foreground">{disabledLabel}</p>;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;

    setBusy(true);
    setError("");

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof payload?.error === "string" ? payload.error : errorLabel);
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="message-body">{label}</Label>
        <Textarea
          id="message-body"
          rows={5}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={busy || !body.trim()}>{busy ? sendingLabel : sendLabel}</Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
