import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingFlow } from "@/components/bookings/BookingFlow";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDictionaryFor } from "@/lib/dictionaries";
import { tryConnectToDatabase } from "@/lib/db/client";
import { isLocale } from "@/lib/i18n";
import { findActiveMeetingType } from "@/lib/platform/bookings";
import { meetingLocationLabels, type MeetingLocation } from "@/lib/platform/enums";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/rendez-vous/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const dict = await getDictionaryFor(locale);
  const type = (await tryConnectToDatabase()) ? await findActiveMeetingType(slug, locale) : null;

  return createMetadata({
    locale,
    routeKey: "booking",
    title: type?.name || dict.platform.booking.title,
    description: type?.description || dict.platform.booking.lead,
    segments: { fr: [slug], en: [slug] },
  });
}

/**
 * Réservation d'un type de rencontre.
 *
 * Un type désactivé rend 404 plutôt qu'une page grisée : son adresse a pu être
 * partagée, et il vaut mieux dire clairement qu'elle ne mène plus nulle part que
 * de laisser espérer une réouverture.
 */
export default async function BookingPage({ params }: PageProps<"/[locale]/rendez-vous/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionaryFor(locale);
  const t = dict.platform.booking;

  if (!(await tryConnectToDatabase())) {
    return (
      <Container>
        <PageHeader eyebrow={t.title} title={t.title} description={dict.platform.common.networkError} />
        <div className="pb-20" />
      </Container>
    );
  }

  const type = await findActiveMeetingType(slug, locale);
  if (!type) notFound();

  const location =
    type.locationDetail ||
    meetingLocationLabels[type.location as MeetingLocation]?.[locale] ||
    type.location;

  return (
    <Container>
      <PageHeader
        eyebrow={`${type.durationMinutes} ${t.minutes} · ${location}`}
        title={type.name}
        description={type.description || t.lead}
      />

      <div className="pb-20">
        <BookingFlow
          dict={dict}
          locale={locale}
          slug={type.slug}
          durationMinutes={type.durationMinutes}
        />
      </div>
    </Container>
  );
}
