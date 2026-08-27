import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { CalendarEventModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { calendarEventInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Introuvable" }, { status: 404 });

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

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

  /*
   * Une entrée issue d'une réservation ne se déplace pas ici : le réservant a
   * reçu une invitation d'agenda pour l'heure convenue, et la bouger dans notre
   * dos la laisserait fausse chez lui. Pour changer d'heure, on annule et on
   * reprogramme — ce qui repart avec un courriel.
   */
  const doc = await CalendarEventModel.findOneAndUpdate(
    { _id: id, bookingId: null },
    {
      $set: {
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
      },
    },
    { new: true },
  ).lean();

  if (!doc) {
    const exists = await CalendarEventModel.exists({ _id: id });
    return exists
      ? NextResponse.json(
          {
            error:
              "Cette entrée vient d'un rendez-vous réservé. Annulez le rendez-vous pour libérer le créneau : la personne doit en être avertie.",
          },
          { status: 409 },
        )
      : notFound();
  }

  return NextResponse.json({ id });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  await connectToDatabase();
  const doc = await CalendarEventModel.findOneAndDelete({ _id: id, bookingId: null }).lean();

  if (!doc) {
    const exists = await CalendarEventModel.exists({ _id: id });
    return exists
      ? NextResponse.json(
          { error: "Cette entrée vient d'un rendez-vous réservé : annulez le rendez-vous." },
          { status: 409 },
        )
      : notFound();
  }

  return NextResponse.json({ ok: true });
}
