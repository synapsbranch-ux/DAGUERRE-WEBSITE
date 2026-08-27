import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CancelBooking } from "@/components/bookings/CancelBooking";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDictionaryFor } from "@/lib/dictionaries";
import { tryConnectToDatabase } from "@/lib/db/client";
import { BookingModel, MeetingTypeModel } from "@/lib/db/models/platform";
import { isLocale } from "@/lib/i18n";
import { readBookingToken, toMeetingType } from "@/lib/platform/bookings";
import { formatMeeting, isPast } from "@/lib/platform/scheduling";
import { createMetadata } from "@/lib/seo";

type Doc = Record<string, unknown>;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/rendez-vous/gerer">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionaryFor(locale);
  return createMetadata({
    locale,
    routeKey: "bookingManage",
    title: dict.platform.booking.manageTitle,
    description: dict.platform.booking.manageLead,
    noIndex: true,
  });
}

/**
 * Gestion d'un rendez-vous par la personne qui l'a réservé.
 *
 * Le jeton de l'URL est la seule autorisation. La page n'affiche que ce que son
 * porteur a lui-même fourni — son rendez-vous, son heure — et rien de l'agenda
 * autour : un lien partagé par mégarde ne doit rien révéler d'autre.
 */
export default async function ManageBookingPage({
  params,
  searchParams,
}: PageProps<"/[locale]/rendez-vous/gerer">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const query = await searchParams;
  const token = typeof query.jeton === "string" ? query.jeton : "";
  const dict = await getDictionaryFor(locale);
  const t = dict.platform.booking;

  const shell = (title: string, body: string, extra?: React.ReactNode) => (
    <Container>
      <PageHeader eyebrow={t.manageTitle} title={title} description={body} />
      <div className="pb-20">{extra}</div>
    </Container>
  );

  const bookingId = readBookingToken(token);
  if (!bookingId) return shell(t.manageInvalid, t.manageInvalid);

  if (!(await tryConnectToDatabase())) {
    return shell(t.manageTitle, dict.platform.common.networkError);
  }

  const booking = (await BookingModel.findById(bookingId).lean()) as Doc | null;
  if (!booking) return shell(t.manageInvalid, t.manageInvalid);

  const start = booking.startAt instanceof Date ? booking.startAt : new Date(String(booking.startAt));
  const timezone = String(booking.timezone || "UTC");
  const when = formatMeeting(start, timezone, locale);

  const typeDoc = (await MeetingTypeModel.findById(booking.meetingTypeId).lean()) as Doc | null;
  const typeName = typeDoc ? toMeetingType(typeDoc, locale).name : "";

  if (booking.status === "cancelled") {
    return shell(t.cancelledTitle, t.alreadyCancelled, <p className="text-sm text-muted-foreground">{`${typeName} — ${when}`}</p>);
  }

  const past = isPast(start);

  return shell(
    `${typeName} — ${when}`,
    past ? t.past : t.manageLead,
    past ? null : (
      <div className="max-w-2xl">
        <CancelBooking dict={dict} token={token} />
      </div>
    ),
  );
}
