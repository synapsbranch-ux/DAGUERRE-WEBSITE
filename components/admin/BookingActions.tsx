"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Suite donnée à un rendez-vous.
 *
 * Annuler **prévient la personne** et retire l'entrée de son agenda : c'est ce
 * qui distingue une annulation d'une disparition. « Honoré » et « absent » sont
 * des constats internes, postérieurs à la rencontre, et n'envoient rien.
 */
export function BookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  async function call(status: string) {
    setBusy(true);
    setError("");
    setNotice("");

    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, reason }),
    }).catch(() => null);

    setBusy(false);

    const payload = (await response?.json().catch(() => null)) as { error?: unknown } | null;

    if (!response?.ok) {
      setError(typeof payload?.error === "string" ? payload.error : "L'opération a échoué.");
      return;
    }

    // L'annulation peut aboutir sans que l'avis parte : la personne doit alors
    // être prévenue autrement, et l'administrateur doit le savoir.
    if (typeof payload?.error === "string") setNotice(payload.error);
    setConfirming(false);
    setReason("");
    router.refresh();
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => call("completed")}>
          Honoré
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => call("no_show")}>
          Absent
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => setConfirming((current) => !current)}
        >
          Annuler
        </Button>
      </div>

      {confirming ? (
        <div className="grid gap-2 rounded-md border border-destructive/40 p-3">
          <p className="text-xs text-muted-foreground">
            La personne reçoit un avis d&apos;annulation, et l&apos;entrée disparaît de son agenda.
          </p>
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motif (facultatif)"
          />
          <div>
            <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => call("cancelled")}>
              Confirmer l&apos;annulation
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
      {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}
    </div>
  );
}
