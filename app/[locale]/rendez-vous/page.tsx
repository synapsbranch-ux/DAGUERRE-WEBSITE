import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDictionaryFor } from "@/lib/dictionaries";
import { tryConnectToDatabase } from "@/lib/db/client";
import { isLocale } from "@/lib/i18n";
import { listActiveMeetingTypes } from "@/lib/platform/bookings";
import { meetingLocationLabels, type MeetingLocation } from "@/lib/platform/enums";
import { createMetadata } from "@/lib/seo";
import { href } from "@/lib/routes";

export async function generateMetadata({ params }: PageProps<"/[locale]/rendez-vous">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionaryFor(locale);
  return createMetadata({
    locale,
    routeKey: "booking",
    title: dict.platform.booking.title,
    description: dict.platform.booking.lead,
  });
}

/** Types de rencontre proposés à la réservation. */
export default async function BookingIndexPage({ params }: PageProps<"/[locale]/rendez-vous">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionaryFor(locale);
  const t = dict.platform.booking;

  const types = (await tryConnectToDatabase()) ? await listActiveMeetingTypes(locale) : [];

  return (
    <Container>
      <PageHeader eyebrow={dict.platform.portal.title} title={t.title} description={t.lead} />

      <div className="pb-20">
        {types.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noTypes}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {types.map((type) => (
              <li key={type.id}>
                <Link
                  href={href("booking", locale, type.slug)}
                  className="grid h-full gap-2 rounded-lg border border-border p-5 transition-colors hover:bg-[var(--plate)]"
                >
                  <h2 className="font-heading text-lg">{type.name}</h2>
                  {type.description ? (
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {type.durationMinutes} {t.minutes} ·{" "}
                    {meetingLocationLabels[type.location as MeetingLocation]?.[locale] ?? type.location}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
