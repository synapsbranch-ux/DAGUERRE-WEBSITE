"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { meetingLocationLabels, meetingLocations } from "@/lib/platform/enums";

export type MeetingTypeRow = {
  id?: string;
  slug: string;
  nameFr: string;
  nameEn: string;
  descriptionFr: string;
  descriptionEn: string;
  durationMinutes: string;
  bufferBefore: string;
  bufferAfter: string;
  minNoticeHours: string;
  maxDaysAhead: string;
  location: string;
  locationDetail: string;
  active: boolean;
  position: string;
};

export const EMPTY_MEETING_TYPE: MeetingTypeRow = {
  slug: "",
  nameFr: "",
  nameEn: "",
  descriptionFr: "",
  descriptionEn: "",
  durationMinutes: "30",
  bufferBefore: "0",
  bufferAfter: "15",
  minNoticeHours: "12",
  maxDaysAhead: "60",
  location: "video",
  locationDetail: "",
  active: true,
  position: "0",
};

/**
 * Type de rencontre proposé à la réservation.
 *
 * Le raccourci (`slug`) est dans l'URL publique : le changer casse les liens
 * déjà partagés, ce que le formulaire annonce plutôt que de le laisser
 * découvrir.
 *
 * Désactiver retire le type de la page de réservation sans toucher aux
 * rendez-vous déjà pris — c'est presque toujours ce qu'on veut, et la
 * suppression est d'ailleurs refusée dès qu'un rendez-vous s'y rattache.
 */
export function MeetingTypeEditor({ initial }: { initial: MeetingTypeRow }) {
  const router = useRouter();
  const [row, setRow] = useState<MeetingTypeRow>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const set = <K extends keyof MeetingTypeRow>(key: K, value: MeetingTypeRow[K]) =>
    setRow((current) => ({ ...current, [key]: value }));

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");

    const payload = {
      slug: row.slug,
      name: { fr: row.nameFr, en: row.nameEn },
      description: { fr: row.descriptionFr, en: row.descriptionEn },
      durationMinutes: Number(row.durationMinutes) || 30,
      bufferBefore: Number(row.bufferBefore) || 0,
      bufferAfter: Number(row.bufferAfter) || 0,
      minNoticeHours: Number(row.minNoticeHours) || 0,
      maxDaysAhead: Number(row.maxDaysAhead) || 60,
      location: row.location,
      locationDetail: row.locationDetail,
      active: row.active,
      position: Number(row.position) || 0,
    };

    const response = await fetch(
      row.id ? `/api/admin/meeting-types/${row.id}` : "/api/admin/meeting-types",
      {
        method: row.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    ).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : "L'enregistrement a échoué.");
      return;
    }

    setMessage("Type de rencontre enregistré.");
    if (!row.id) setRow({ ...EMPTY_MEETING_TYPE });
    router.refresh();
  }

  async function remove() {
    if (!row.id) return;
    setBusy(true);
    setError("");

    const response = await fetch(`/api/admin/meeting-types/${row.id}`, { method: "DELETE" }).catch(
      () => null,
    );
    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : "La suppression a échoué.");
      return;
    }
    router.refresh();
  }

  const id = row.id ?? "new";

  return (
    <div className="grid gap-4 rounded-lg border border-border p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`mt-name-fr-${id}`}>Intitulé (fr)</Label>
          <Input
            id={`mt-name-fr-${id}`}
            value={row.nameFr}
            onChange={(event) => set("nameFr", event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`mt-name-en-${id}`}>Intitulé (en)</Label>
          <Input
            id={`mt-name-en-${id}`}
            value={row.nameEn}
            onChange={(event) => set("nameEn", event.target.value)}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor={`mt-slug-${id}`}>Raccourci</Label>
          <Input
            id={`mt-slug-${id}`}
            value={row.slug}
            onChange={(event) => set("slug", event.target.value)}
            placeholder="decouverte"
          />
          <p className="text-xs text-muted-foreground">
            Apparaît dans l&apos;adresse de réservation. Le changer rompt les liens déjà partagés.
          </p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`mt-desc-fr-${id}`}>Description (fr)</Label>
          <Textarea
            id={`mt-desc-fr-${id}`}
            rows={2}
            value={row.descriptionFr}
            onChange={(event) => set("descriptionFr", event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`mt-desc-en-${id}`}>Description (en)</Label>
          <Textarea
            id={`mt-desc-en-${id}`}
            rows={2}
            value={row.descriptionEn}
            onChange={(event) => set("descriptionEn", event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <NumberField label="Durée (min)" id={`mt-duration-${id}`} value={row.durationMinutes} onChange={(v) => set("durationMinutes", v)} />
        <NumberField label="Marge avant" id={`mt-before-${id}`} value={row.bufferBefore} onChange={(v) => set("bufferBefore", v)} />
        <NumberField label="Marge après" id={`mt-after-${id}`} value={row.bufferAfter} onChange={(v) => set("bufferAfter", v)} />
        <NumberField label="Préavis (h)" id={`mt-notice-${id}`} value={row.minNoticeHours} onChange={(v) => set("minNoticeHours", v)} />
        <NumberField label="Horizon (j)" id={`mt-ahead-${id}`} value={row.maxDaysAhead} onChange={(v) => set("maxDaysAhead", v)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-[200px_1fr_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor={`mt-location-${id}`}>Lieu</Label>
          <select
            id={`mt-location-${id}`}
            value={row.location}
            onChange={(event) => set("location", event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            {meetingLocations.map((value) => (
              <option key={value} value={value}>
                {meetingLocationLabels[value].fr}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`mt-detail-${id}`}>Précision</Label>
          <Input
            id={`mt-detail-${id}`}
            value={row.locationDetail}
            onChange={(event) => set("locationDetail", event.target.value)}
            placeholder="Lien de visioconférence envoyé la veille"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={row.active}
              onChange={(event) => set("active", event.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            Proposé
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={busy || !row.slug.trim() || !row.nameFr.trim()} onClick={save}>
          {busy ? "Enregistrement…" : row.id ? "Enregistrer" : "Créer"}
        </Button>
        {row.id ? (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={remove}>
            Supprimer
          </Button>
        ) : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}

function NumberField({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={0} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
