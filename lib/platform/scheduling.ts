/**
 * Calcul des créneaux réservables.
 *
 * ## Le fuseau est le sujet, pas un détail d'affichage
 *
 * Une règle de disponibilité dit « le mardi, de 9 h à 17 h ». Ces heures sont
 * **locales au fuseau de l'entreprise**, et le restent toute l'année : au
 * passage à l'heure d'été, 9 h reste 9 h. Les stocker en UTC les décalerait
 * d'une heure deux fois par an — c'est l'erreur classique du rendez-vous qui
 * glisse fin mars.
 *
 * On garde donc les règles en minutes depuis minuit, et l'on convertit vers UTC
 * **pour une date donnée**, en interrogeant le fuseau à cette date-là.
 *
 * ## Sans dépendance de fuseau horaire
 *
 * `Intl` embarque déjà la base IANA : `timeZoneName: "longOffset"` donne le
 * décalage effectif d'un instant dans un fuseau. Ajouter une bibliothèque
 * n'apporterait que le risque d'une base de fuseaux périmée par rapport à celle
 * du système.
 *
 * ## Ce qui est pur ici
 *
 * Tout ce module est sans effet de bord et sans accès à la base : les intervalles
 * occupés lui sont **fournis**. C'est ce qui rend le calcul de créneaux
 * exhaustivement testable — un contrôle de conflit qu'on ne peut pas tester est
 * un contrôle auquel on ne peut pas se fier.
 */

export type Interval = { start: Date; end: Date };

export type AvailabilityWindow = {
  /** 0 = dimanche, comme `Date.getDay()`. */
  weekday: number;
  startMinute: number;
  endMinute: number;
};

export type SlotOptions = {
  /** Jour civil visé, dans le fuseau de référence : `2026-09-15`. */
  day: string;
  timeZone: string;
  windows: AvailabilityWindow[];
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  /** Créneaux déjà pris — rendez-vous confirmés et entrées d'agenda. */
  busy: Interval[];
  /** Instant de référence ; injecté pour rendre le calcul reproductible. */
  now: Date;
  /** Pas de la grille de créneaux, en minutes. */
  stepMinutes?: number;
};

const MINUTE = 60_000;
const DEFAULT_STEP = 15;

/* ------------------------------------------------------------------ */
/* Fuseaux                                                             */
/* ------------------------------------------------------------------ */

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function offsetFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = offsetFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" });
    offsetFormatters.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * Décalage d'un fuseau, en minutes, **à un instant donné**.
 *
 * Positif à l'est de Greenwich. Le décalage dépend de l'instant : Montréal vaut
 * −300 en janvier et −240 en juillet, et c'est précisément ce qu'il faut
 * interroger plutôt que de supposer.
 */
export function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = offsetFormatter(timeZone).formatToParts(instant);
  const name = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";

  // « GMT » seul signifie décalage nul ; sinon « GMT-04:00 » ou « GMT+5:30 ».
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  if (!match) return 0;

  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/** Découpe `2026-09-15` en trois nombres, ou `null` si la forme est fausse. */
export function parseDay(day: string): { year: number; month: number; date: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  if (month < 1 || month > 12 || date < 1 || date > 31) return null;

  return { year, month, date };
}

/**
 * Instant UTC correspondant à une heure locale dans un fuseau.
 *
 * Deux passes, et c'est nécessaire : pour connaître le décalage il faut un
 * instant, et pour obtenir l'instant il faut le décalage. La première passe
 * estime avec le décalage lu à l'heure naïve, la seconde corrige si l'estimation
 * a franchi un changement d'heure.
 *
 * Pendant l'heure inexistante du passage à l'heure d'été (2 h → 3 h), aucune
 * réponse n'est juste ; la fonction renvoie alors l'instant qui suit le saut,
 * ce qui vaut mieux qu'un créneau proposé à une heure qui n'existe pas.
 */
export function zonedToUtc(
  day: { year: number; month: number; date: number },
  minutesFromMidnight: number,
  timeZone: string,
): Date {
  const naive = Date.UTC(day.year, day.month - 1, day.date, 0, minutesFromMidnight);

  const firstOffset = zoneOffsetMinutes(new Date(naive), timeZone);
  const firstGuess = new Date(naive - firstOffset * MINUTE);

  const secondOffset = zoneOffsetMinutes(firstGuess, timeZone);
  if (secondOffset === firstOffset) return firstGuess;

  return new Date(naive - secondOffset * MINUTE);
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "short",
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Composantes civiles d'un instant, lues dans un fuseau. */
export function zonedParts(instant: Date, timeZone: string): {
  day: string;
  weekday: number;
  minutes: number;
} {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  // `hour12: false` peut rendre « 24 » à minuit selon l'implémentation.
  const hour = Number(get("hour")) % 24;

  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: WEEKDAYS[get("weekday")] ?? 0,
    minutes: hour * 60 + Number(get("minute")),
  };
}

/** Jour civil courant dans un fuseau, sous la forme `2026-09-15`. */
export function todayIn(timeZone: string, now: Date): string {
  return zonedParts(now, timeZone).day;
}

/** Jour civil décalé de `count` jours — sans passer par l'arithmétique locale. */
export function addDays(day: string, count: number): string {
  const parsed = parseDay(day);
  if (!parsed) return day;

  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.date + count));
  return shifted.toISOString().slice(0, 10);
}

/** Écart en jours civils entre deux dates, `to - from`. */
export function daysBetween(from: string, to: string): number {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return 0;

  const start = Date.UTC(a.year, a.month - 1, a.date);
  const end = Date.UTC(b.year, b.month - 1, b.date);
  return Math.round((end - start) / (24 * 60 * MINUTE));
}

/* ------------------------------------------------------------------ */
/* Conflits                                                            */
/* ------------------------------------------------------------------ */

/**
 * Deux intervalles se chevauchent-ils ?
 *
 * Bornes semi-ouvertes : un rendez-vous qui finit à 10 h et un autre qui
 * commence à 10 h **ne** se chevauchent pas. C'est la convention attendue d'un
 * agenda, et l'espacement souhaité entre deux rencontres relève des marges, pas
 * de la définition du conflit.
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/** Premier intervalle occupé qui entre en conflit, s'il y en a un. */
export function findConflict(candidate: Interval, busy: Interval[]): Interval | null {
  return busy.find((entry) => overlaps(candidate, entry)) ?? null;
}

/* ------------------------------------------------------------------ */
/* Créneaux                                                            */
/* ------------------------------------------------------------------ */

/**
 * Créneaux réservables d'une journée.
 *
 * Un créneau est retenu quand les quatre conditions tiennent :
 *
 * 1. il tient **entièrement** dans une plage de disponibilité ;
 * 2. il commence après le délai de prévenance ;
 * 3. le jour reste dans l'horizon de réservation ;
 * 4. le créneau **élargi de ses marges** ne heurte aucun intervalle occupé.
 *
 * L'élargissement porte sur le candidat, pas sur l'occupé : les marges sont une
 * propriété du type de rencontre qu'on réserve, et non des rendez-vous déjà pris,
 * qui ont eu les leurs au moment où ils ont été posés.
 */
export function computeSlots(options: SlotOptions): Date[] {
  const parsed = parseDay(options.day);
  if (!parsed) return [];
  if (options.durationMinutes <= 0) return [];

  const today = todayIn(options.timeZone, options.now);
  const ahead = daysBetween(today, options.day);
  if (ahead < 0 || ahead > options.maxDaysAhead) return [];

  const step = Math.max(1, options.stepMinutes ?? DEFAULT_STEP);
  const earliest = options.now.getTime() + options.minNoticeHours * 60 * MINUTE;

  // Le jour de la semaine se lit à midi local : à minuit, un décalage d'une
  // heure suffirait à désigner la veille.
  const noon = zonedToUtc(parsed, 12 * 60, options.timeZone);
  const weekday = zonedParts(noon, options.timeZone).weekday;

  const slots: Date[] = [];

  for (const window of options.windows) {
    if (window.weekday !== weekday) continue;
    if (window.endMinute <= window.startMinute) continue;

    for (
      let minute = window.startMinute;
      minute + options.durationMinutes <= window.endMinute;
      minute += step
    ) {
      const start = zonedToUtc(parsed, minute, options.timeZone);
      const end = new Date(start.getTime() + options.durationMinutes * MINUTE);

      if (start.getTime() < earliest) continue;

      const padded: Interval = {
        start: new Date(start.getTime() - options.bufferBefore * MINUTE),
        end: new Date(end.getTime() + options.bufferAfter * MINUTE),
      };

      if (findConflict(padded, options.busy)) continue;

      slots.push(start);
    }
  }

  // Deux plages qui se recoupent produiraient deux fois le même créneau.
  const seen = new Set<number>();
  return slots
    .filter((slot) => {
      const key = slot.getTime();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.getTime() - b.getTime());
}

/**
 * L'instant est-il passé ?
 *
 * Isolé de tout composant à dessein : lire l'heure courante pendant un rendu
 * React est une impureté, et la règle `react-hooks/purity` le signale à juste
 * titre. La question posée n'est pas un état d'interface, c'est un fait.
 */
export function isPast(instant: Date, now = new Date()): boolean {
  return instant.getTime() < now.getTime();
}

/** Heure d'un créneau, telle que la lira le réservant. */
export function formatSlot(instant: Date, timeZone: string, locale: "fr" | "en"): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale === "en",
  }).format(instant);
}

/** Date et heure complètes d'un rendez-vous, dans un fuseau donné. */
export function formatMeeting(instant: Date, timeZone: string, locale: "fr" | "en"): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(instant);
}

/**
 * Le fuseau est-il connu du système ?
 *
 * Un fuseau annoncé par le navigateur arrive sans garantie : `Intl` lève sur un
 * identifiant inconnu, et cette exception ne doit pas remonter jusqu'à une
 * réponse d'API.
 */
export function isKnownTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
