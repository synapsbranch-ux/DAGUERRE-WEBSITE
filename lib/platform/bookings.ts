import {
  AvailabilityRuleModel,
  BookingModel,
  CalendarEventModel,
  MeetingTypeModel,
  SchedulingSettingsModel,
} from "@/lib/db/models/platform";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { BOOKING_TTL_SECONDS, createToken, readToken, tokenPurpose } from "@/lib/platform/tokens";
import {
  addDays,
  computeSlots,
  daysBetween,
  overlaps,
  todayIn,
  type AvailabilityWindow,
  type Interval,
} from "@/lib/platform/scheduling";

/**
 * Réservation de rendez-vous.
 *
 * ## Ce qui occupe l'agenda
 *
 * Deux sources, jamais une seule : les **réservations confirmées** et les
 * **entrées d'agenda**. Ne consulter que les réservations proposerait des
 * créneaux au beau milieu d'un déplacement bloqué à la main ; ne consulter que
 * l'agenda ignorerait les réservations qui n'y ont pas encore d'entrée.
 *
 * ## Le contrôle de conflit n'est pas dans le formulaire
 *
 * Les créneaux affichés sont un **confort**. Ce qui empêche deux personnes de
 * réserver la même heure, c'est la revérification faite au moment d'écrire, sur
 * l'état de la base à cet instant — plus l'index unique sur la clé de soumission,
 * qui absorbe le double clic. Un créneau calculé il y a trois minutes ne prouve
 * rien.
 */

type Doc = Record<string, unknown>;

export type SchedulingSettings = {
  timezone: string;
  notifyEmail: string;
  organizerName: string;
  organizerEmail: string;
  slotStepMinutes: number;
};

const FALLBACK: SchedulingSettings = {
  timezone: "America/Toronto",
  notifyEmail: "",
  organizerName: "",
  organizerEmail: "",
  slotStepMinutes: 15,
};

export async function getSchedulingSettings(): Promise<SchedulingSettings> {
  const doc = (await SchedulingSettingsModel.findOne({ key: "scheduling" }).lean()) as Doc | null;
  if (!doc) return { ...FALLBACK };

  return {
    timezone: String(doc.timezone || FALLBACK.timezone),
    notifyEmail: String(doc.notifyEmail ?? ""),
    organizerName: String(doc.organizerName ?? ""),
    organizerEmail: String(doc.organizerEmail ?? ""),
    slotStepMinutes: Number(doc.slotStepMinutes ?? FALLBACK.slotStepMinutes),
  };
}

/* ------------------------------------------------------------------ */
/* Types de rencontre                                                  */
/* ------------------------------------------------------------------ */

export type MeetingType = {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  bufferBefore: number;
  bufferAfter: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  location: string;
  locationDetail: string;
};

function localized(value: unknown, locale: Locale): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const wanted = record[locale];
    if (typeof wanted === "string" && wanted) return wanted;
    const fallback = record[defaultLocale];
    if (typeof fallback === "string") return fallback;
  }
  return "";
}

export function toMeetingType(doc: Doc, locale: Locale): MeetingType {
  return {
    id: String(doc._id),
    slug: String(doc.slug ?? ""),
    name: localized(doc.name, locale),
    description: localized(doc.description, locale),
    durationMinutes: Number(doc.durationMinutes ?? 30),
    bufferBefore: Number(doc.bufferBefore ?? 0),
    bufferAfter: Number(doc.bufferAfter ?? 0),
    minNoticeHours: Number(doc.minNoticeHours ?? 12),
    maxDaysAhead: Number(doc.maxDaysAhead ?? 60),
    location: String(doc.location ?? "video"),
    locationDetail: String(doc.locationDetail ?? ""),
  };
}

export async function listActiveMeetingTypes(locale: Locale): Promise<MeetingType[]> {
  const docs = (await MeetingTypeModel.find({ active: true })
    .sort({ position: 1, createdAt: 1 })
    .lean()) as Doc[];
  return docs.map((doc) => toMeetingType(doc, locale));
}

export async function findActiveMeetingType(slug: string, locale: Locale): Promise<MeetingType | null> {
  const doc = (await MeetingTypeModel.findOne({ slug: slug.toLowerCase(), active: true }).lean()) as Doc | null;
  return doc ? toMeetingType(doc, locale) : null;
}

/* ------------------------------------------------------------------ */
/* Disponibilités                                                      */
/* ------------------------------------------------------------------ */

export async function availabilityWindows(): Promise<AvailabilityWindow[]> {
  const docs = (await AvailabilityRuleModel.find({ active: true }).lean()) as Doc[];
  return docs.map((doc) => ({
    weekday: Number(doc.weekday ?? 0),
    startMinute: Number(doc.startMinute ?? 0),
    endMinute: Number(doc.endMinute ?? 0),
  }));
}

/**
 * Intervalles occupés sur une fenêtre de temps.
 *
 * La fenêtre est élargie d'une journée de part et d'autre : un rendez-vous
 * commencé la veille au soir peut déborder sur le matin demandé, et l'oublier
 * proposerait un créneau déjà pris.
 */
export async function busyIntervals(from: Date, to: Date): Promise<Interval[]> {
  const start = new Date(from.getTime() - 24 * 60 * 60_000);
  const end = new Date(to.getTime() + 24 * 60 * 60_000);

  const [bookings, events] = await Promise.all([
    BookingModel.find({
      status: { $in: ["confirmed", "completed"] },
      startAt: { $lt: end },
      endAt: { $gt: start },
    })
      .select("startAt endAt")
      .lean(),
    CalendarEventModel.find({ startAt: { $lt: end }, endAt: { $gt: start } })
      .select("startAt endAt")
      .lean(),
  ]);

  return [...(bookings as Doc[]), ...(events as Doc[])]
    .map((doc) => ({
      start: doc.startAt instanceof Date ? doc.startAt : new Date(String(doc.startAt)),
      end: doc.endAt instanceof Date ? doc.endAt : new Date(String(doc.endAt)),
    }))
    .filter((interval) => !Number.isNaN(interval.start.getTime()) && !Number.isNaN(interval.end.getTime()));
}

export type DaySlots = { day: string; slots: Date[] };

/**
 * Créneaux réservables d'un type de rencontre, sur plusieurs jours.
 *
 * Une seule lecture des occupations couvre toute la période : interroger la base
 * par jour multiplierait les allers-retours pour un résultat identique.
 */
export async function slotsForRange(
  type: MeetingType,
  fromDay: string,
  days: number,
  now: Date,
): Promise<DaySlots[]> {
  const settings = await getSchedulingSettings();
  const windows = await availabilityWindows();
  if (windows.length === 0) return [];

  const today = todayIn(settings.timezone, now);
  const start = daysBetween(today, fromDay) < 0 ? today : fromDay;
  const last = addDays(start, Math.max(0, days - 1));

  const busy = await busyIntervals(
    new Date(`${start}T00:00:00.000Z`),
    new Date(`${last}T23:59:59.999Z`),
  );

  const result: DaySlots[] = [];

  for (let index = 0; index < days; index += 1) {
    const day = addDays(start, index);
    result.push({
      day,
      slots: computeSlots({
        day,
        timeZone: settings.timezone,
        windows,
        durationMinutes: type.durationMinutes,
        bufferBefore: type.bufferBefore,
        bufferAfter: type.bufferAfter,
        minNoticeHours: type.minNoticeHours,
        maxDaysAhead: type.maxDaysAhead,
        busy,
        now,
        stepMinutes: settings.slotStepMinutes,
      }),
    });
  }

  return result;
}

/**
 * Le créneau demandé est-il **encore** libre, à cet instant précis ?
 *
 * Revérification faite au moment d'écrire, sur l'état courant de la base. C'est
 * elle qui empêche la double réservation ; la liste affichée au réservant, elle,
 * peut avoir plusieurs minutes de retard.
 */
export async function slotStillFree(
  type: MeetingType,
  start: Date,
  end: Date,
): Promise<boolean> {
  const padded: Interval = {
    start: new Date(start.getTime() - type.bufferBefore * 60_000),
    end: new Date(end.getTime() + type.bufferAfter * 60_000),
  };

  const busy = await busyIntervals(padded.start, padded.end);
  return !busy.some((interval) => overlaps(padded, interval));
}

/**
 * Le créneau demandé tombe-t-il bien dans une plage de disponibilité ?
 *
 * Sans ce contrôle, une requête forgée poserait un rendez-vous à trois heures du
 * matin : les créneaux affichés ne sont qu'une proposition, et rien n'oblige un
 * client à s'y tenir.
 */
export async function slotIsOffered(type: MeetingType, start: Date, now: Date): Promise<boolean> {
  const settings = await getSchedulingSettings();
  const day = todayIn(settings.timezone, start);

  const [days] = await Promise.all([slotsForRange(type, day, 1, now)]);
  return (days[0]?.slots ?? []).some((slot) => slot.getTime() === start.getTime());
}

/* ------------------------------------------------------------------ */
/* Jetons de gestion                                                   */
/* ------------------------------------------------------------------ */

/**
 * Lien de gestion d'un rendez-vous.
 *
 * Le réservant n'a pas de compte : ce jeton est la seule façon de lui permettre
 * d'annuler. Il ne porte que l'identifiant de sa réservation, et n'ouvre rien
 * d'autre.
 */
export function bookingToken(bookingId: string): string {
  return createToken(tokenPurpose.bookingManage, bookingId, BOOKING_TTL_SECONDS);
}

export function readBookingToken(token: string | null | undefined): string | null {
  return readToken(tokenPurpose.bookingManage, token);
}

/**
 * Jeton d'abonnement au flux iCalendar de l'agenda.
 *
 * Permanent, comme un lien de désabonnement : une URL d'abonnement se colle une
 * fois dans un agenda de bureau et doit répondre encore des mois plus tard. Le
 * sujet est fixe — le jeton n'ouvre que ce flux, en lecture seule.
 */
export const CALENDAR_FEED_SUBJECT = "agenda";

export function calendarFeedToken(): string {
  return createToken(tokenPurpose.calendarFeed, CALENDAR_FEED_SUBJECT);
}

export function isCalendarFeedToken(token: string | null | undefined): boolean {
  return readToken(tokenPurpose.calendarFeed, token) === CALENDAR_FEED_SUBJECT;
}

/** Locale d'une réservation, normalisée. */
export function bookingLocale(doc: Doc): Locale {
  const value = String(doc.locale ?? "");
  return isLocale(value) ? value : defaultLocale;
}
