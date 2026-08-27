"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AvailabilityRow = { weekday: number; start: string; end: string; active: boolean };

const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/** `09:30` → 570. Une valeur illisible vaut 0, que le serveur refusera. */
function toMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

/**
 * Plages de disponibilité hebdomadaires.
 *
 * Les heures saisies sont **locales au fuseau de référence** et le restent toute
 * l'année : « 9 h à 17 h » reste 9 h à 17 h après le changement d'heure. C'est
 * pourquoi elles sont stockées en minutes depuis minuit, et non en instants.
 *
 * L'enregistrement remplace l'ensemble des plages d'un coup : une semaine se lit
 * et se corrige comme un tout.
 */
export function AvailabilityEditor({ initial }: { initial: AvailabilityRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<AvailabilityRow[]>(
    initial.length > 0 ? initial : [{ weekday: 1, start: "09:00", end: "17:00", active: true }],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const patch = (index: number, next: Partial<AvailabilityRow>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...next } : row)));

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");

    const invalid = rows.find((row) => toMinutes(row.end) <= toMinutes(row.start));
    if (invalid) {
      setBusy(false);
      setError("Une plage se termine avant de commencer.");
      return;
    }

    const response = await fetch("/api/admin/availability", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        rows.map((row) => ({
          weekday: row.weekday,
          startMinute: toMinutes(row.start),
          endMinute: toMinutes(row.end),
          active: row.active,
        })),
      ),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : "L'enregistrement a échoué.");
      return;
    }

    setMessage("Disponibilités enregistrées.");
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <ul className="grid gap-3">
        {rows.map((row, index) => (
          <li key={index} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_120px_120px_auto_auto]">
            <div className="grid gap-1.5">
              <Label htmlFor={`rule-day-${index}`}>Jour</Label>
              <select
                id={`rule-day-${index}`}
                value={row.weekday}
                onChange={(event) => patch(index, { weekday: Number(event.target.value) })}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {WEEKDAYS.map((label, value) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`rule-start-${index}`}>De</Label>
              <Input
                id={`rule-start-${index}`}
                type="time"
                value={row.start}
                onChange={(event) => patch(index, { start: event.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`rule-end-${index}`}>À</Label>
              <Input
                id={`rule-end-${index}`}
                type="time"
                value={row.end}
                onChange={(event) => patch(index, { end: event.target.value })}
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={row.active}
                  onChange={(event) => patch(index, { active: event.target.checked })}
                  className="size-4 accent-[var(--accent)]"
                />
                Active
              </label>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
              >
                Retirer
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setRows((current) => [...current, { weekday: 1, start: "09:00", end: "17:00", active: true }])
          }
        >
          Ajouter une plage
        </Button>
        <Button type="button" disabled={busy} onClick={save}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}
