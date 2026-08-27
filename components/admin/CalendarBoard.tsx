"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { eventKindLabels, eventKinds } from "@/lib/platform/enums";

export type BoardEvent = {
  id: string;
  title: string;
  kind: string;
  /** Instants ISO — le rendu se fait dans le fuseau de référence. */
  startAt: string;
  endAt: string;
  location: string;
  /** Issu d'une réservation : ni déplaçable, ni supprimable ici. */
  fromBooking: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Semaine d'agenda.
 *
 * Une grille horaire au pixel près serait plus jolie et bien moins lisible sur
 * un téléphone : on empile donc les journées, chacune listant ses entrées dans
 * l'ordre. C'est aussi ce qui permet d'afficher une entrée de trois jours sans
 * la découper.
 *
 * Toutes les heures sont rendues dans le **fuseau de référence** de
 * l'entreprise, jamais dans celui du navigateur de l'administrateur : c'est
 * dans ce fuseau que l'agenda est tenu, et un administrateur en déplacement ne
 * doit pas voir ses rendez-vous glisser.
 */
export function CalendarBoard({
  events,
  timezone,
  weekStart,
  basePath,
}: {
  events: BoardEvent[];
  timezone: string;
  /** Premier jour affiché, au format `2026-09-14`. */
  weekStart: string;
  /** Chemin de la page, pour la navigation de semaine en semaine. */
  basePath: string;
}) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>("meeting");
  const [date, setDate] = useState(weekStart);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("10:00");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const days = useMemo(() => {
    const base = Date.parse(`${weekStart}T00:00:00.000Z`);
    return Array.from({ length: 7 }, (_, index) =>
      new Date(base + index * DAY_MS).toISOString().slice(0, 10),
    );
  }, [weekStart]);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-CA", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [timezone],
  );

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("fr-CA", {
        timeZone: timezone,
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [timezone],
  );

  /**
   * Répartition des entrées par journée **du fuseau de référence**.
   *
   * Découper sur l'ISO UTC placerait un rendez-vous de 20 h à Montréal au
   * lendemain : le jour civil se lit dans le fuseau, pas dans la chaîne.
   */
  const byDay = useMemo(() => {
    const dayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const map = new Map<string, BoardEvent[]>();
    for (const event of events) {
      const key = dayKey.format(new Date(event.startAt));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
    }
    return map;
  }, [events, timezone]);

  /**
   * Une heure locale saisie dans le fuseau de référence, convertie en instant.
   *
   * Deux passes : le décalage dépend de l'instant, et l'instant du décalage.
   * C'est la même mécanique que côté serveur, et pour la même raison — sans
   * quoi une entrée créée en mars glisserait d'une heure.
   */
  function toInstant(day: string, time: string): string {
    const [hour, minute] = time.split(":").map(Number);
    const naive = Date.parse(`${day}T00:00:00.000Z`) + ((hour || 0) * 60 + (minute || 0)) * 60_000;

    const offsetAt = (instant: number) => {
      const name = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "longOffset" })
        .formatToParts(new Date(instant))
        .find((part) => part.type === "timeZoneName")?.value;
      const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name ?? "");
      if (!match) return 0;
      const sign = match[1] === "-" ? -1 : 1;
      return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
    };

    const first = naive - offsetAt(naive) * 60_000;
    const second = naive - offsetAt(first) * 60_000;
    return new Date(second).toISOString();
  }

  /* La semaine visible est portée par l'URL : elle survit à un rechargement,
     et se partage par simple copie du lien. */
  const goto = (day: string) => router.push(`${basePath}?semaine=${day}`);

  async function create() {
    setBusy(true);
    setError("");

    const response = await fetch("/api/admin/calendar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        kind,
        location,
        startAt: toInstant(date, from),
        endAt: toInstant(date, to),
      }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : "L'entrée n'a pas pu être créée.");
      return;
    }

    setTitle("");
    setDescription("");
    setLocation("");
    setOpen(false);
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");

    const response = await fetch(`/api/admin/calendar/${id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : "La suppression a échoué.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => goto(new Date(Date.parse(`${weekStart}T00:00:00Z`) - 7 * DAY_MS).toISOString().slice(0, 10))}
        >
          Semaine précédente
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => goto(new Date(Date.parse(`${weekStart}T00:00:00Z`) + 7 * DAY_MS).toISOString().slice(0, 10))}
        >
          Semaine suivante
        </Button>
        <Button type="button" size="sm" onClick={() => setOpen((current) => !current)}>
          {open ? "Fermer" : "Nouvelle entrée"}
        </Button>
        <span className="text-xs text-muted-foreground">Heures affichées en {timezone}</span>
      </div>

      {open ? (
        <section className="grid gap-3 rounded-lg border border-border p-5">
          <h2 className="font-heading text-lg">Nouvelle entrée</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="event-title">Titre</Label>
              <Input id="event-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="event-kind">Nature</Label>
              <select
                id="event-kind"
                value={kind}
                onChange={(event) => setKind(event.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                {eventKinds.map((value) => (
                  <option key={value} value={value}>
                    {eventKindLabels[value].fr}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="event-date">Date</Label>
              <Input id="event-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="event-from">Début</Label>
              <Input id="event-from" type="time" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="event-to">Fin</Label>
              <Input id="event-to" type="time" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="event-location">Lieu</Label>
              <Input
                id="event-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="event-description">Note</Label>
              <Textarea
                id="event-description"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
          <div>
            <Button type="button" disabled={busy || !title.trim()} onClick={create}>
              {busy ? "Enregistrement…" : "Ajouter"}
            </Button>
          </div>
        </section>
      ) : null}

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
        {days.map((day) => {
          const entries = byDay.get(day) ?? [];
          return (
            <section key={day} className="grid gap-2 rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium capitalize">
                {dayFormatter.format(new Date(`${day}T12:00:00.000Z`))}
              </h3>
              {entries.length === 0 ? (
                <p className="text-xs text-muted-foreground">Rien de prévu.</p>
              ) : (
                <ul className="grid gap-2">
                  {entries.map((event) => (
                    <li key={event.id} className="grid gap-0.5 rounded-md bg-[var(--plate)] p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{event.title}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {timeFormatter.format(new Date(event.startAt))}–
                          {timeFormatter.format(new Date(event.endAt))}
                        </span>
                      </div>
                      {event.location ? (
                        <span className="text-xs text-muted-foreground">{event.location}</span>
                      ) : null}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{eventKindLabels[event.kind as "meeting"]?.fr ?? event.kind}</span>
                        {event.fromBooking ? (
                          <span>· rendez-vous réservé</span>
                        ) : (
                          <button
                            type="button"
                            className="underline"
                            disabled={busy}
                            onClick={() => remove(event.id)}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
