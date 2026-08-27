import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { BookingModel, MeetingTypeModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { isDuplicateKeyError } from "@/lib/platform/idempotency";
import { revalidateContent } from "@/lib/revalidate";
import { meetingTypeInputSchema } from "@/lib/validation-platform";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Introuvable" }, { status: 404 });

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = meetingTypeInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();

  try {
    const doc = await MeetingTypeModel.findByIdAndUpdate(id, { $set: parsed.data }, { new: true }).lean();
    if (doc) revalidateContent("meetingTypes");
    return doc ? NextResponse.json({ id }) : notFound();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: "Ce raccourci est déjà utilisé." }, { status: 409 });
    }
    throw error;
  }
}

/**
 * Suppression d'un type de rencontre.
 *
 * Refusée dès qu'un rendez-vous à venir s'y rattache : l'écran d'administration
 * et le courriel d'annulation lisent son intitulé, et le supprimer laisserait
 * des rendez-vous sans nom. **Désactiver** le retire de la réservation publique
 * sans rien casser — c'est ce qu'on veut presque toujours.
 */
export async function DELETE(_: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { id } = await params;
  if (!validObjectId(id)) return notFound();

  await connectToDatabase();

  const used = await BookingModel.exists({ meetingTypeId: id });
  if (used) {
    return NextResponse.json(
      {
        error:
          "Des rendez-vous s'y rattachent : désactivez ce type plutôt que de le supprimer. Il disparaîtra de la page de réservation.",
      },
      { status: 409 },
    );
  }

  const doc = await MeetingTypeModel.findByIdAndDelete(id).lean();
  if (doc) revalidateContent("meetingTypes");
  return doc ? NextResponse.json({ ok: true }) : notFound();
}
