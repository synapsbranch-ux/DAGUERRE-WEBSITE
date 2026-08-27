import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { BookingModel, CalendarEventModel, MeetingTypeModel } from "@/lib/db/models/platform";
import { absoluteLink } from "@/lib/email/layout";
import { sendTransactionalEmail } from "@/lib/email/service";
import { bookingCancelledEmail } from "@/lib/email/templates";
import { readJson, validObjectId } from "@/lib/http";
import { recordAudit } from "@/lib/platform/audit";
import { bookingLocale, toMeetingType } from "@/lib/platform/bookings";
import { bookingStatuses, type BookingStatus } from "@/lib/platform/enums";
import { calendarAttachment } from "@/lib/platform/ics";
import { formatMeeting } from "@/lib/platform/scheduling";
import { href } from "@/lib/routes";

type Ctx = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

type Doc = Record<string, unknown>;

const notFound = () => NextResponse.json({ error: "Introuvable" }, { status: 404 });

/**
 * Changement d'état d'un rendez-vous par l'administration.
 *
 * Annuler **prévient la personne** : c'est la différence entre une annulation et
 * une disparition. L'invitation d'annulation retire l'entrée de son agenda, sans
 * quoi elle se présenterait.
 *
 * Marquer « honoré » ou « absent » ne prévient personne — ce sont des constats
 * internes, postérieurs à la rencontre, qui n'appellent aucun message.
 */
export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const body = json.data as { status?: unknown; reason?: unknown };
  const status = String(body?.status ?? "");
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, 1000) : "";

  if (!(bookingStatuses as readonly string[]).includes(status) || status === "confirmed") {
    return NextResponse.json({ error: "État invalide." }, { status: 400 });
  }

  await connectToDatabase();

  const booking = (await BookingModel.findOneAndUpdate(
    { _id: id, status: "confirmed" },
    {
      $set: {
        status: status as BookingStatus,
        ...(status === "cancelled" ? { cancelledAt: new Date(), cancelReason: reason } : {}),
      },
    },
    { new: true },
  ).lean()) as Doc | null;

  if (!booking) {
    const exists = await BookingModel.exists({ _id: id });
    return exists
      ? NextResponse.json({ error: "Ce rendez-vous n'est plus confirmé." }, { status: 409 })
      : notFound();
  }

  const session = await readSession();
  await recordAudit({
    actorId: session?.user.id,
    actorEmail: session?.user.email,
    action: "booking_cancelled",
    entityType: "Booking",
    entityId: id,
    metadata: { status },
  });

  if (status !== "cancelled") return NextResponse.json({ ok: true });

  await CalendarEventModel.deleteMany({ bookingId: id });

  const locale = bookingLocale(booking);
  const start = booking.startAt instanceof Date ? booking.startAt : new Date(String(booking.startAt));
  const end = booking.endAt instanceof Date ? booking.endAt : new Date(String(booking.endAt));

  const typeDoc = (await MeetingTypeModel.findById(booking.meetingTypeId).lean()) as Doc | null;
  const typeName = typeDoc ? toMeetingType(typeDoc, locale).name : "";

  const outcome = await sendTransactionalEmail(
    String(booking.email ?? ""),
    bookingCancelledEmail(locale, {
      typeName,
      when: formatMeeting(start, String(booking.timezone || "UTC"), locale),
      reason,
      bookingUrl: absoluteLink(href("booking", locale)),
    }),
    calendarAttachment(
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
    ),
  );

  if (!outcome.ok) {
    // Le rendez-vous est bel et bien annulé ; c'est l'avis qui n'est pas parti,
    // et l'administrateur doit le savoir pour prévenir autrement.
    return NextResponse.json({
      ok: true,
      error: `Le rendez-vous est annulé, mais l'avis n'est pas parti vers ${String(booking.email ?? "")}.`,
    });
  }

  return NextResponse.json({ ok: true });
}
