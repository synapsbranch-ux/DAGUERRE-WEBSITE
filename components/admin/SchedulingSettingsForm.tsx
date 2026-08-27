"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SchedulingDraft = {
  timezone: string;
  notifyEmail: string;
  organizerName: string;
  organizerEmail: string;
  slotStepMinutes: string;
};

/**
 * Réglages de l'agenda.
 *
 * Le fuseau de référence est le réglage structurant : c'est en lui que
 * s'expriment les plages de disponibilité, et le changer redéfinit tous les
 * créneaux proposés. Le formulaire le dit, parce que la conséquence n'est pas
 * devinable depuis un champ intitulé « fuseau ».
 */
export function SchedulingSettingsForm({ initial }: { initial: SchedulingDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<SchedulingDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const set = <K extends keyof SchedulingDraft>(key: K, value: SchedulingDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/scheduling-settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...draft,
        slotStepMinutes: Number(draft.slotStepMinutes) || 15,
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
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="sched-tz">Fuseau de référence</Label>
          <Input
            id="sched-tz"
            value={draft.timezone}
            onChange={(event) => set("timezone", event.target.value)}
            placeholder="America/Toronto"
          />
          <p className="text-xs text-muted-foreground">
            Identifiant IANA. Vos plages de disponibilité s&apos;expriment dans ce fuseau : en changer
            redéfinit tous les créneaux proposés.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sched-step">Pas des créneaux (min)</Label>
          <Input
            id="sched-step"
            type="number"
            min={5}
            max={120}
            value={draft.slotStepMinutes}
            onChange={(event) => set("slotStepMinutes", event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sched-notify">Avis de réservation</Label>
          <Input
            id="sched-notify"
            type="email"
            value={draft.notifyEmail}
            onChange={(event) => set("notifyEmail", event.target.value)}
            placeholder="Sinon, l'adresse de facturation"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sched-organizer">Organisateur (nom)</Label>
          <Input
            id="sched-organizer"
            value={draft.organizerName}
            onChange={(event) => set("organizerName", event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="sched-organizer-email">Organisateur (courriel)</Label>
          <Input
            id="sched-organizer-email"
            type="email"
            value={draft.organizerEmail}
            onChange={(event) => set("organizerEmail", event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Figure comme organisateur dans l&apos;invitation d&apos;agenda envoyée au réservant.
          </p>
        </div>
      </div>

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
