import {
  AdminDatabaseError,
  AdminFilters,
  AdminPageHeader,
  AdminPagination,
  AdminSelect,
  AdminTable,
  type AdminColumn,
} from "@/components/admin/AdminTable";
import { BookingActions } from "@/components/admin/BookingActions";
import { Badge } from "@/components/ui/badge";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { BookingModel, MeetingTypeModel } from "@/lib/db/models/platform";
import { defaultLocale } from "@/lib/i18n";
import { buildListHref, readPage, readParam } from "@/lib/platform/admin-filters";
import { getSchedulingSettings, toMeetingType } from "@/lib/platform/bookings";
import { bookingStatusLabels, bookingStatuses, type BookingStatus } from "@/lib/platform/enums";
import { formatMeeting } from "@/lib/platform/scheduling";

const BASE = "/admin/rendez-vous";
const PAGE_SIZE = 25;

type Doc = Record<string, unknown>;

type Row = {
  id: string;
  when: string;
  type: string;
  person: string;
  contact: string;
  status: BookingStatus;
  note: string;
};

/**
 * Réservations.
 *
 * Les heures sont rendues dans le **fuseau de référence** de l'entreprise, pas
 * dans celui qu'a annoncé le réservant : cet écran sert à tenir un agenda, et
 * mélanger les fuseaux d'une ligne à l'autre le rendrait illisible. Le fuseau du
 * réservant reste porté par sa réservation et sert à lui écrire.
 */
export default async function AdminBookingsPage({ searchParams }: PageProps<"/admin/rendez-vous">) {
  await requireAdmin();

  if (!(await tryConnectToDatabase())) return <AdminDatabaseError title="Réservations" />;

  const settings = await getSchedulingSettings();

  const raw = await searchParams;
  const params = new URLSearchParams(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );

  const page = readPage(params);
  const status = readParam(params, "statut");
  const search = readParam(params, "q");

  const filter: Record<string, unknown> = {};
  if ((bookingStatuses as readonly string[]).includes(status)) filter.status = status;
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [docs, total, typeDocs] = await Promise.all([
    BookingModel.find(filter)
      .sort({ startAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    BookingModel.countDocuments(filter),
    MeetingTypeModel.find().lean(),
  ]);

  const typeNames = new Map(
    (typeDocs as Doc[]).map((doc) => [String(doc._id), toMeetingType(doc, defaultLocale).name]),
  );

  const rows: Row[] = (docs as Doc[]).map((doc) => {
    const start = doc.startAt instanceof Date ? doc.startAt : new Date(String(doc.startAt));
    return {
      id: String(doc._id),
      when: formatMeeting(start, settings.timezone, defaultLocale),
      type: typeNames.get(String(doc.meetingTypeId)) ?? "—",
      person: String(doc.name ?? ""),
      contact: String(doc.email ?? ""),
      status: String(doc.status ?? "confirmed") as BookingStatus,
      note: String(doc.note ?? ""),
    };
  });

  const columns: AdminColumn<Row>[] = [
    { key: "when", header: "Quand", cell: (row) => row.when },
    { key: "type", header: "Rencontre", cell: (row) => row.type },
    {
      key: "person",
      header: "Personne",
      cell: (row) => (
        <span className="grid gap-0.5">
          <span className="font-medium">{row.person}</span>
          <span className="text-xs text-muted-foreground">{row.contact}</span>
          {row.note ? <span className="text-xs text-muted-foreground">{row.note}</span> : null}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      cell: (row) => (
        <Badge
          variant={
            row.status === "cancelled" || row.status === "no_show"
              ? "destructive"
              : row.status === "completed"
                ? "default"
                : "outline"
          }
        >
          {bookingStatusLabels[row.status]?.fr ?? row.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (row.status === "confirmed" ? <BookingActions bookingId={row.id} /> : null),
    },
  ];

  return (
    <>
      <AdminPageHeader
        group="Rendez-vous"
        title="Réservations"
        description={`Heures affichées en ${settings.timezone}, le fuseau dans lequel l'agenda est tenu.`}
      />

      <AdminFilters action={BASE} query={search} searchLabel="Rechercher" placeholder="Nom, courriel…">
        <AdminSelect
          name="statut"
          label="Statut"
          value={status}
          options={[
            { value: "", label: "Tous" },
            ...bookingStatuses.map((value) => ({ value, label: bookingStatusLabels[value].fr })),
          ]}
        />
      </AdminFilters>

      <AdminTable
        columns={columns}
        rows={rows}
        empty={{
          title: "Aucune réservation",
          description: "Déclarez vos disponibilités et un type de rencontre pour ouvrir la réservation.",
          ctaLabel: "Disponibilités",
          ctaHref: "/admin/disponibilites",
        }}
      />

      <AdminPagination
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        buildHref={(next) => buildListHref(BASE, params, next)}
      />
    </>
  );
}
