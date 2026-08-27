import { AdminDatabaseError, AdminPageHeader } from "@/components/admin/AdminTable";
import { CalendarBoard, type BoardEvent } from "@/components/admin/CalendarBoard";
import { CopyUrlButton } from "@/components/admin/CopyUrlButton";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { CalendarEventModel } from "@/lib/db/models/platform";
import { absoluteLink } from "@/lib/email/layout";
import { calendarFeedToken, getSchedulingSettings } from "@/lib/platform/bookings";
import { readParam } from "@/lib/platform/admin-filters";
import { addDays, parseDay, todayIn } from "@/lib/platform/scheduling";

type Doc = Record<string, unknown>;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Semaine d'agenda.
 *
 * La semaine visible est portée par l'URL (`?semaine=`), ce qui la rend
 * partageable et la fait survivre à un rechargement. Sans paramètre, on ouvre
 * sur la semaine courante **du fuseau de référence** : celui dans lequel
 * l'agenda est tenu, et non celui du serveur, qui est presque toujours UTC.
 */
export default async function AdminAgendaPage({ searchParams }: PageProps<"/admin/agenda">) {
  await requireAdmin();

  if (!(await tryConnectToDatabase())) return <AdminDatabaseError title="Agenda" />;

  const settings = await getSchedulingSettings();

  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const requested = readParam(params, "semaine");
  const anchor = parseDay(requested) ? requested : todayIn(settings.timezone, new Date());

  // La semaine commence le lundi : c'est la convention civile ici, et elle
  // range le week-end d'un seul côté.
  const anchorDate = new Date(`${anchor}T12:00:00.000Z`);
  const offset = (anchorDate.getUTCDay() + 6) % 7;
  const weekStart = addDays(anchor, -offset);

  const from = new Date(`${weekStart}T00:00:00.000Z`);
  const to = new Date(from.getTime() + 8 * DAY_MS);

  const docs = (await CalendarEventModel.find({ startAt: { $gte: from, $lt: to } })
    .sort({ startAt: 1 })
    .limit(500)
    .lean()) as Doc[];

  const events: BoardEvent[] = docs.map((doc) => ({
    id: String(doc._id),
    title: String(doc.title ?? ""),
    kind: String(doc.kind ?? "meeting"),
    startAt: (doc.startAt instanceof Date ? doc.startAt : new Date(String(doc.startAt))).toISOString(),
    endAt: (doc.endAt instanceof Date ? doc.endAt : new Date(String(doc.endAt))).toISOString(),
    location: String(doc.location ?? ""),
    fromBooking: Boolean(doc.bookingId),
  }));

  const feedUrl = absoluteLink(
    `/api/calendar/feed?jeton=${encodeURIComponent(calendarFeedToken())}`,
  );

  return (
    <>
      <AdminPageHeader
        group="Rendez-vous"
        title="Agenda"
        description="Les entrées bloquent les créneaux proposés à la réservation."
      />

      <div className="mt-8">
        <CalendarBoard
          events={events}
          timezone={settings.timezone}
          weekStart={weekStart}
          basePath="/admin/agenda"
        />
      </div>

      <section className="mt-12 grid max-w-3xl gap-3 rounded-lg border border-border p-5">
        <h2 className="font-heading text-lg">Abonnement iCalendar</h2>
        <p className="text-sm text-muted-foreground">
          Collez cette adresse dans Apple Calendrier, Google Agenda ou Outlook pour suivre l&apos;agenda
          en lecture seule. Elle contient un jeton : traitez-la comme un mot de passe, et ne la
          publiez pas.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            readOnly
            value={feedUrl}
            className="min-w-0 flex-1 rounded-md border border-border bg-[var(--plate)] px-3 py-2 font-mono text-xs"
          />
          <CopyUrlButton url={feedUrl} size="sm" />
        </div>
      </section>
    </>
  );
}
