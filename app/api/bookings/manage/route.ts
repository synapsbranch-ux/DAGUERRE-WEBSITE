import { NextResponse } from "next/server";

import { tryConnectToDatabase } from "@/lib/db/client";
import { BookingModel, CalendarEventModel, MeetingTypeModel } from "@/lib/db/models/platform";
import { absoluteLink } from "@/lib/email/layout";
import { sendTransactionalEmail } from "@/lib/email/service";
import { bookingCancelledEmail } from "@/lib/email/templates";
import { clientIp, readJson } from "@/lib/http";
import { defaultLocale } from "@/lib/i18n";
import { getBillingSettings } from "@/lib/platform/billing";
import {
  bookingLocale,
  getSchedulingSettings,
  readBookingToken,
  toMeetingType,
} from "@/lib/platform/bookings";
import { calendarAttachment } from "@/lib/platform/ics";
import { formatMeeting } from "@/lib/platform/scheduling";
import { slidingWindow } from "@/lib/rate-limit";
import { href } from "@/lib/routes";
import { bookingCancelSchema } from "@/lib/validation-platform";

export const runtime = "nodejs";

type Doc = Record<string, unknown>;

const notFound = () => NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 404 });

/**
 * Annulation d'un rendez-vous par la personne qui l'a réservé.
 *
 * Le jeton porte l'autorisation : le réservant n'a pas de compte, et lui en
 * demander un pour annuler produirait surtout des absences non annoncées.
 *
 * L'entrée d'agenda correspondante est supprimée dans la foulée : la laisser
 * bloquerait un créneau désormais libre, et l'écran de l'administrateur
 * afficherait un rendez-vous qui n'existe plus.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const bookingId = readBookingToken(url.searchParams.get("jeton"));
  if (!bookingId) return notFound();

  if (!(await slidingWindow(`booking-cancel:${clientIp(request)}`, 20, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de tentatives." }, { status: 429 });
  }

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = bookingCancelSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Motif invalide." }, { status: 400 });

  if (!(await tryConnectToDatabase())) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  // Conditionnelle : deux envois simultanés n'annulent qu'une fois, et un
  // rendez-vous déjà annulé ne redéclenche pas d'avis.
  const booking = (await BookingModel.findOneAndUpdate(
    { _id: bookingId, status: "confirmed" },
    { $set: { status: "cancelled", cancelledAt: new Date(), cancelReason: parsed.data.reason } },
    { new: true },
  ).lean()) as Doc | null;

  if (!booking) {
    const exists = await BookingModel.exists({ _id: bookingId });
    return exists
      ? NextResponse.json({ error: "Ce rendez-vous est déjà annulé." }, { status: 409 })
      : notFound();
  }

  await CalendarEventModel.deleteMany({ bookingId });

  const locale = bookingLocale(booking);
  const start = booking.startAt instanceof Date ? booking.startAt : new Date(String(booking.startAt));
  const end = booking.endAt instanceof Date ? booking.endAt : new Date(String(booking.endAt));
  const timezone = String(booking.timezone || "UTC");

  const typeDoc = (await MeetingTypeModel.findById(booking.meetingTypeId).lean()) as Doc | null;
  const typeName = typeDoc ? toMeetingType(typeDoc, locale).name : "";

  /*
   * L'annulation d'agenda part en pièce jointe avec `method=CANCEL` : c'est ce
   * qui retire l'entrée de l'agenda du destinataire. Un simple courriel la
   * laisserait en place, et la personne se présenterait.
   */
  const attachments = calendarAttachment(
    [
      {
        id: String(booking._id),
        title: `${typeName} — ${String(booking.name ?? "")}`,
        start,
        end,
        cancelled: true,
        sequence: 1,
      },
    ],
    "CANCEL",
  );

  const bookingUrl = absoluteLink(href("booking", locale));

  await sendTransactionalEmail(
    String(booking.email ?? ""),
    bookingCancelledEmail(locale, {
      typeName,
      when: formatMeeting(start, timezone, locale),
      reason: parsed.data.reason,
      bookingUrl,
    }),
    attachments,
  ).catch(() => undefined);

  const settings = await getSchedulingSettings();
  const billing = await getBillingSettings();
  const notify = settings.notifyEmail || billing.email;

  if (notify) {
    await sendTransactionalEmail(
      notify,
      bookingCancelledEmail(defaultLocale, {
        typeName: `${typeName} — ${String(booking.name ?? "")}`,
        when: formatMeeting(start, settings.timezone, defaultLocale),
        reason: parsed.data.reason,
        bookingUrl: absoluteLink("/admin/agenda"),
      }),
    ).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
