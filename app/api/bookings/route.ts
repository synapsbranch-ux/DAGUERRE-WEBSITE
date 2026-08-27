import { NextResponse } from "next/server";

import { tryConnectToDatabase } from "@/lib/db/client";
import { BookingModel, CalendarEventModel } from "@/lib/db/models/platform";
import { absoluteLink } from "@/lib/email/layout";
import { sendTransactionalEmail } from "@/lib/email/service";
import { bookingConfirmedEmail, bookingNoticeEmail } from "@/lib/email/templates";
import { clientIp, readJson } from "@/lib/http";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { getSiteSettings } from "@/lib/content";
import { getBillingSettings } from "@/lib/platform/billing";
import {
  bookingToken,
  findActiveMeetingType,
  getSchedulingSettings,
  slotIsOffered,
  slotStillFree,
  slotsForRange,
} from "@/lib/platform/bookings";
import { meetingLocationLabels, type MeetingLocation } from "@/lib/platform/enums";
import { isDuplicateKeyError, submissionKeyFrom } from "@/lib/platform/idempotency";
import { calendarAttachment } from "@/lib/platform/ics";
import { formatMeeting, isKnownTimeZone, parseDay } from "@/lib/platform/scheduling";
import { slidingWindow } from "@/lib/rate-limit";
import { href } from "@/lib/routes";
import { bookingInputSchema } from "@/lib/validation-platform";

export const runtime = "nodejs";

const MAX_DAYS = 31;

/**
 * Créneaux réservables.
 *
 * Rien de sensible ne sort d'ici : ce sont des heures libres, pas l'agenda. Les
 * rendez-vous existants ne fuient ni par leur titre, ni par leur participant —
 * seulement par leur absence dans la liste.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const slug = (url.searchParams.get("type") ?? "").toLowerCase();
  const from = url.searchParams.get("du") ?? "";
  const days = Math.min(MAX_DAYS, Math.max(1, Number(url.searchParams.get("jours") ?? 7)));
  const localeValue = url.searchParams.get("langue") ?? "";
  const locale: Locale = isLocale(localeValue) ? localeValue : defaultLocale;

  if (!/^[a-z0-9-]{1,120}$/.test(slug) || !parseDay(from)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!(await slidingWindow(`slots:${clientIp(request)}`, 120, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  if (!(await tryConnectToDatabase())) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const type = await findActiveMeetingType(slug, locale);
  if (!type) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const settings = await getSchedulingSettings();
  const range = await slotsForRange(type, from, days, new Date());

  return NextResponse.json({
    timezone: settings.timezone,
    durationMinutes: type.durationMinutes,
    days: range.map((entry) => ({
      day: entry.day,
      slots: entry.slots.map((slot) => slot.toISOString()),
    })),
  });
}

/**
 * Réservation d'un créneau.
 *
 * Trois contrôles, dans cet ordre, et aucun n'est redondant :
 *
 * 1. **Le créneau est-il proposé ?** Il doit tomber dans une plage de
 *    disponibilité, respecter le délai de prévenance et l'horizon. Sans quoi une
 *    requête forgée poserait un rendez-vous à trois heures du matin — les
 *    créneaux affichés ne sont qu'une proposition.
 * 2. **Est-il encore libre ?** Revérifié sur l'état de la base au moment
 *    d'écrire : la liste consultée par le visiteur peut avoir plusieurs minutes.
 * 3. **L'index unique sur la clé de soumission** absorbe le double clic, que les
 *    deux premiers contrôles laisseraient passer s'ils s'exécutent en parallèle.
 *
 * La durée vient du **type de rencontre**, jamais du corps de la requête : sinon
 * on réserverait deux heures sur un créneau de trente minutes.
 */
export async function POST(request: Request) {
  if (!(await slidingWindow(`booking:${clientIp(request)}`, 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de réservations. Réessayez plus tard." }, { status: 429 });
  }

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = bookingInputSchema.safeParse(json.data);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Piège à pourriel : succès factice, pour que le robot ne réessaie pas sans.
  if (data.website) return NextResponse.json({ ok: true });

  if (!(await tryConnectToDatabase())) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const type = await findActiveMeetingType(data.meetingTypeSlug, data.locale);
  if (!type) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const start = new Date(data.startAt);
  const end = new Date(start.getTime() + type.durationMinutes * 60_000);
  const now = new Date();

  if (!(await slotIsOffered(type, start, now))) {
    return NextResponse.json(
      { error: "Ce créneau n'est pas proposé. Choisissez-en un autre." },
      { status: 409 },
    );
  }

  if (!(await slotStillFree(type, start, end))) {
    return NextResponse.json(
      { error: "Ce créneau vient d'être réservé. Choisissez-en un autre." },
      { status: 409 },
    );
  }

  const settings = await getSchedulingSettings();
  const site = await getSiteSettings(data.locale);
  const timezone = isKnownTimeZone(data.timezone) ? data.timezone : settings.timezone;

  const submissionKey = submissionKeyFrom(null, [
    "booking",
    data.email,
    type.id,
    start.toISOString(),
  ]);

  let booking;
  try {
    booking = await BookingModel.create({
      meetingTypeId: type.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      note: data.note,
      startAt: start,
      endAt: end,
      timezone,
      locale: data.locale,
      status: "confirmed",
      submissionKey,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      // Même personne, même créneau, à quelques secondes : c'est un double
      // envoi, pas une seconde réservation. On répond comme au premier.
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw error;
  }

  /*
   * L'entrée d'agenda est créée avec la réservation. C'est elle qui rend le
   * créneau occupé pour la vue agenda, et son absence laisserait l'écran de
   * l'administrateur muet sur un rendez-vous pourtant pris.
   */
  await CalendarEventModel.create({
    title: `${type.name} — ${data.name}`,
    description: data.note,
    kind: "meeting",
    startAt: start,
    endAt: end,
    location: type.locationDetail || type.location,
    bookingId: booking._id,
  });

  const manageUrl = absoluteLink(
    `${href("bookingManage", data.locale)}?jeton=${encodeURIComponent(bookingToken(String(booking._id)))}`,
  );

  const locationLabel =
    meetingLocationLabels[type.location as MeetingLocation]?.[data.locale] ?? type.location;

  const attachments = calendarAttachment(
    [
      {
        id: String(booking._id),
        title: `${type.name} — ${data.name}`,
        description: data.note,
        location: type.locationDetail || locationLabel,
        start,
        end,
        url: manageUrl,
        organizer:
          settings.organizerEmail
            ? { name: settings.organizerName || "Daguerre", email: settings.organizerEmail }
            : undefined,
        attendees: [{ name: data.name, email: data.email }],
      },
    ],
    "REQUEST",
    site?.brandName ?? "",
  );

  await sendTransactionalEmail(
    data.email,
    bookingConfirmedEmail(data.locale, {
      typeName: type.name,
      when: formatMeeting(start, timezone, data.locale),
      timezone,
      durationMinutes: type.durationMinutes,
      location: type.locationDetail || locationLabel,
      manageUrl,
    }),
    attachments,
  ).catch(() => undefined);

  // Avis interne : l'heure y est exprimée dans le fuseau de l'entreprise, celui
  // dans lequel l'agenda est tenu.
  const billing = await getBillingSettings();
  const notify = settings.notifyEmail || billing.email;

  if (notify) {
    await sendTransactionalEmail(
      notify,
      bookingNoticeEmail(defaultLocale, {
        typeName: type.name,
        when: formatMeeting(start, settings.timezone, defaultLocale),
        name: data.name,
        email: data.email,
        phone: data.phone,
        note: data.note,
        adminUrl: absoluteLink("/admin/agenda"),
      }),
    ).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, manageUrl }, { status: 201 });
}
