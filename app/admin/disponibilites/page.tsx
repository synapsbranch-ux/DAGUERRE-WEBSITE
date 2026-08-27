import { AdminDatabaseError, AdminPageHeader } from "@/components/admin/AdminTable";
import { AvailabilityEditor, type AvailabilityRow } from "@/components/admin/AvailabilityEditor";
import {
  EMPTY_MEETING_TYPE,
  MeetingTypeEditor,
  type MeetingTypeRow,
} from "@/components/admin/MeetingTypeEditor";
import { SchedulingSettingsForm } from "@/components/admin/SchedulingSettingsForm";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { AvailabilityRuleModel, MeetingTypeModel } from "@/lib/db/models/platform";
import { getSchedulingSettings } from "@/lib/platform/bookings";

type Doc = Record<string, unknown>;

/** `570` → `09:30`. */
function toTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function localized(value: unknown, key: "fr" | "en"): string {
  if (typeof value === "string") return key === "fr" ? value : "";
  const record = (value ?? {}) as Record<string, unknown>;
  return typeof record[key] === "string" ? (record[key] as string) : "";
}

/**
 * Disponibilités, types de rencontre et réglages de l'agenda.
 *
 * Les trois sont réunis parce qu'ils ne se comprennent que l'un par l'autre :
 * une plage n'ouvre rien sans un type de rencontre, et un type de rencontre ne
 * propose rien sans plage. Les séparer sur trois écrans obligerait à faire
 * l'aller-retour pour comprendre pourquoi la page de réservation reste vide.
 */
export default async function AdminAvailabilityPage() {
  await requireAdmin();

  if (!(await tryConnectToDatabase())) return <AdminDatabaseError title="Disponibilités" />;

  const [settings, ruleDocs, typeDocs] = await Promise.all([
    getSchedulingSettings(),
    AvailabilityRuleModel.find().sort({ weekday: 1, startMinute: 1 }).lean(),
    MeetingTypeModel.find().sort({ position: 1, createdAt: 1 }).lean(),
  ]);

  const rules: AvailabilityRow[] = (ruleDocs as Doc[]).map((doc) => ({
    weekday: Number(doc.weekday ?? 1),
    start: toTime(Number(doc.startMinute ?? 540)),
    end: toTime(Number(doc.endMinute ?? 1020)),
    active: doc.active !== false,
  }));

  const types: MeetingTypeRow[] = (typeDocs as Doc[]).map((doc) => ({
    id: String(doc._id),
    slug: String(doc.slug ?? ""),
    nameFr: localized(doc.name, "fr"),
    nameEn: localized(doc.name, "en"),
    descriptionFr: localized(doc.description, "fr"),
    descriptionEn: localized(doc.description, "en"),
    durationMinutes: String(doc.durationMinutes ?? 30),
    bufferBefore: String(doc.bufferBefore ?? 0),
    bufferAfter: String(doc.bufferAfter ?? 0),
    minNoticeHours: String(doc.minNoticeHours ?? 12),
    maxDaysAhead: String(doc.maxDaysAhead ?? 60),
    location: String(doc.location ?? "video"),
    locationDetail: String(doc.locationDetail ?? ""),
    active: doc.active !== false,
    position: String(doc.position ?? 0),
  }));

  return (
    <>
      <AdminPageHeader
        group="Rendez-vous"
        title="Disponibilités"
        description="Ce que la page de réservation propose découle d'ici : des plages, des types de rencontre, un fuseau."
      />

      <section className="mt-10 grid max-w-4xl gap-4">
        <h2 className="font-heading text-xl">Réglages</h2>
        <SchedulingSettingsForm
          initial={{
            timezone: settings.timezone,
            notifyEmail: settings.notifyEmail,
            organizerName: settings.organizerName,
            organizerEmail: settings.organizerEmail,
            slotStepMinutes: String(settings.slotStepMinutes),
          }}
        />
      </section>

      <section className="mt-14 grid max-w-4xl gap-4">
        <div className="grid gap-1">
          <h2 className="font-heading text-xl">Plages hebdomadaires</h2>
          <p className="text-sm text-muted-foreground">
            Heures locales au fuseau {settings.timezone}. Elles restent identiques toute l&apos;année :
            « 9 h » demeure 9 h après le changement d&apos;heure.
          </p>
        </div>
        <AvailabilityEditor initial={rules} />
      </section>

      <section className="mt-14 grid max-w-4xl gap-6">
        <div className="grid gap-1">
          <h2 className="font-heading text-xl">Types de rencontre</h2>
          <p className="text-sm text-muted-foreground">
            Chacun a sa durée, ses marges et son adresse de réservation.
          </p>
        </div>

        {types.map((type) => (
          <MeetingTypeEditor key={type.id} initial={type} />
        ))}

        <div className="grid gap-2">
          <h3 className="font-heading text-lg">Ajouter un type</h3>
          <MeetingTypeEditor initial={EMPTY_MEETING_TYPE} />
        </div>
      </section>
    </>
  );
}
