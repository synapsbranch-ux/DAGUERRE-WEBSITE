import { NextResponse } from "next/server";

import { readSession, requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { CalendarEventModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { calendarEventInputSchema } from "@/lib/validation-platform";

/**
 * Création d'une entrée d'agenda.
 *
 * Une entrée bloque le créneau : c'est le seul moyen de retirer une plage de
 * la réservation publique sans toucher aux règles de disponibilité, qui sont
 * hebdomadaires et n'ont pas à porter les exceptions.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = calendarEventInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const start = new Date(parsed.data.startAt);
  const end = new Date(parsed.data.endAt);

  if (end.getTime() <= start.getTime()) {
    return NextResponse.json({ error: "La fin doit suivre le début." }, { status: 400 });
  }

  await connectToDatabase();
  const session = await readSession();

  const doc = await CalendarEventModel.create({
    title: parsed.data.title,
    description: parsed.data.description,
    kind: parsed.data.kind,
    startAt: start,
    endAt: end,
    allDay: parsed.data.allDay,
    location: parsed.data.location,
    clientId: parsed.data.clientId,
    quoteRequestId: parsed.data.quoteRequestId || null,
    projectId: parsed.data.projectId || null,
    createdById: session?.user.id ?? "",
  });

  return NextResponse.json({ id: String(doc._id) }, { status: 201 });
}
