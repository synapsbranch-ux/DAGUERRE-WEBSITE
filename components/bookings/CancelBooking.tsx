"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * Annulation par la personne qui a réservé.
 *
 * Le jeton de l'URL est la seule autorisation : le réservant n'a pas de compte,
 * et lui en demander un pour annuler produirait surtout des absences non
 * annoncées.
 */
export function CancelBooking({ dict, token }: { dict: Dictionary; token: string }) {
  const t = dict.platform.booking;

  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function cancel() {
    setBusy(true);
    setError("");

    const response = await fetch(`/api/bookings/manage?jeton=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    }).catch(() => null);

    setBusy(false);

    const payload = (await response?.json().catch(() => null)) as { error?: unknown } | null;

    if (!response?.ok) {
      setError(typeof payload?.error === "string" ? payload.error : dict.platform.common.error);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-[var(--plate)] p-6">
        <h2 className="font-heading text-xl">{t.cancelledTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.cancelledBody}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border p-5">
      <div className="grid gap-1.5">
        <Label htmlFor="cancel-reason">{t.cancelReason}</Label>
        <Textarea
          id="cancel-reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      <div>
        <Button type="button" variant="destructive" disabled={busy} onClick={cancel}>
          {busy ? dict.platform.common.sending : t.cancel}
        </Button>
      </div>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
