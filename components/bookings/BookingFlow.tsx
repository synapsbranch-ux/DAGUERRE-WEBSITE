"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

type DayResponse = { day: string; slots: string[] };

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 14;

/**
 * Choix d'un créneau et réservation.
 *
 * ## Les heures s'affichent dans le fuseau du visiteur
 *
 * Le serveur renvoie des instants absolus ; c'est le navigateur qui les rend
 * dans son propre fuseau, lu par `Intl`. Un visiteur à Paris voit donc l'heure
 * de Paris — et c'est ce même fuseau qui repart avec la réservation, pour que
 * le courriel de confirmation annonce la même heure que l'écran.
 *
 * ## Rien ici n'empêche une double réservation
 *
 * Les créneaux affichés peuvent avoir plusieurs minutes de retard. Ce qui
 * empêche deux personnes de prendre la même heure, c'est la revérification
 * faite par le serveur au moment d'écrire. Un conflit se répond donc par un
 * message clair et un rafraîchissement de la liste, pas par une garde ici.
 */
export function BookingFlow({
  dict,
  locale,
  slug,
  durationMinutes,
}: {
  dict: Dictionary;
  locale: Locale;
  slug: string;
  durationMinutes: number;
}) {
  const t = dict.platform.booking;

  const timezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  /*
   * Le jour de départ est celui du **visiteur**, pas du serveur : celui-ci rend
   * la page sans connaître son fuseau, et figer une date au rendu la rendrait
   * fausse dès le lendemain. `useSyncExternalStore` est la façon prévue de lire
   * une valeur extérieure à React qui diffère entre serveur et navigateur — le
   * serveur rend une chaîne vide, le navigateur sa date locale.
   */
  const today = useSyncExternalStore(
    () => () => {},
    () => new Date().toLocaleDateString("en-CA"),
    () => "",
  );

  const [from, setFrom] = useState("");
  const day = from || today;

  /**
   * Clé de la requête en cours.
   *
   * Le chargement se **déduit** de l'écart entre ce qui est demandé et ce qui
   * est arrivé, au lieu d'être un état posé à la main : un drapeau `loading`
   * mis à jour depuis un effet produit des rendus en cascade, et se désynchronise
   * dès qu'une réponse arrive après qu'on a changé de date.
   */
  const query = day
    ? new URLSearchParams({ type: slug, du: day, jours: String(WINDOW_DAYS), langue: locale }).toString()
    : "";

  // Incrémenté après un conflit, pour forcer une relecture de la même fenêtre.
  const [refresh, setRefresh] = useState(0);
  const key = query ? `${query}#${refresh}` : "";

  const [loaded, setLoaded] = useState<{ key: string; days: DayResponse[] }>({ key: "", days: [] });

  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [manageUrl, setManageUrl] = useState("");

  const loading = Boolean(key) && loaded.key !== key;
  const days = loaded.key === key ? loaded.days : [];

  useEffect(() => {
    if (!key) return;

    // Une réponse arrivée après un changement de date ne doit pas écraser la
    // suivante : chaque effet annule le sien en se démontant.
    let cancelled = false;

    void (async () => {
      const response = await fetch(`/api/bookings?${query}`).catch(() => null);
      const payload = response?.ok
        ? ((await response.json().catch(() => null)) as { days?: DayResponse[] } | null)
        : null;

      if (!cancelled) setLoaded({ key, days: payload?.days ?? [] });
    })();

    return () => {
      cancelled = true;
    };
  }, [key, query]);

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: locale === "en",
      }),
    [locale, timezone],
  );

  const dayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
        timeZone: timezone,
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [locale, timezone],
  );

  const withSlots = days.filter((day) => day.slots.length > 0);

  async function submit() {
    setBusy(true);
    setError("");

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        meetingTypeSlug: slug,
        startAt: selected,
        name,
        email,
        phone,
        note,
        timezone,
        locale,
      }),
    }).catch(() => null);

    setBusy(false);

    const payload = (await response?.json().catch(() => null)) as
      | { error?: unknown; manageUrl?: string }
      | null;

    if (!response?.ok) {
      setError(typeof payload?.error === "string" ? payload.error : t.failed);
      // Le créneau a pu être pris entre-temps : on recharge plutôt que de
      // laisser le visiteur réessayer sur une heure qui n'existe plus.
      setSelected("");
      setRefresh((current) => current + 1);
      return;
    }

    setManageUrl(typeof payload?.manageUrl === "string" ? payload.manageUrl : "");
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-[var(--plate)] p-6">
        <h2 className="font-heading text-xl">{t.confirmedTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.confirmedBody}</p>
        {manageUrl ? (
          <p className="mt-4 text-sm">
            <a href={manageUrl} className="underline">
              {t.manageTitle}
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="booking-from">{t.chooseDate}</Label>
            <Input
              id="booking-from"
              type="date"
              value={day}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setFrom(
                new Date(Date.parse(`${day}T00:00:00Z`) + WINDOW_DAYS * DAY_MS)
                  .toISOString()
                  .slice(0, 10),
              )
            }
          >
            {dict.platform.common.next}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t.timezone} : {timezone}
          </span>
        </div>

        <h2 className="font-heading text-lg">{t.chooseSlot}</h2>

        {loading ? (
          <p className="text-sm text-muted-foreground">{dict.platform.common.loading}</p>
        ) : withSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.noSlots} {t.noSlotsHelp}
          </p>
        ) : (
          <ul className="grid gap-4">
            {withSlots.map((day) => (
              <li key={day.day} className="grid gap-2">
                <h3 className="text-sm font-medium capitalize">
                  {dayFormatter.format(new Date(`${day.day}T12:00:00.000Z`))}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {day.slots.map((slot) => (
                    <Button
                      key={slot}
                      type="button"
                      size="sm"
                      variant={selected === slot ? "default" : "secondary"}
                      aria-pressed={selected === slot}
                      onClick={() => setSelected(slot)}
                    >
                      {timeFormatter.format(new Date(slot))}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected ? (
        <section className="grid gap-4 rounded-lg border border-border p-5">
          <h2 className="font-heading text-lg">{t.yourDetails}</h2>
          <p className="text-sm text-muted-foreground">
            {timeFormatter.format(new Date(selected))} · {durationMinutes} {t.minutes} · {timezone}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="booking-name">{t.name}</Label>
              <Input
                id="booking-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="booking-email">{t.email}</Label>
              <Input
                id="booking-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="booking-phone">{t.phone}</Label>
              <Input
                id="booking-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="booking-note">{t.note}</Label>
              <Textarea
                id="booking-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={busy || !name.trim() || !email.trim()} onClick={submit}>
              {busy ? t.confirming : t.confirm}
            </Button>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
