import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { MeetingTypeModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { isDuplicateKeyError } from "@/lib/platform/idempotency";
import { revalidateContent } from "@/lib/revalidate";
import { meetingTypeInputSchema } from "@/lib/validation-platform";

/** Création d'un type de rencontre proposé à la réservation. */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = meetingTypeInputSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();

  try {
    const doc = await MeetingTypeModel.create(parsed.data);
    revalidateContent("meetingTypes");
    return NextResponse.json({ id: String(doc._id) }, { status: 201 });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      // Le slug est dans l'URL publique de réservation : deux types qui le
      // partagent en rendraient un inaccessible.
      return NextResponse.json({ error: "Ce raccourci est déjà utilisé." }, { status: 409 });
    }
    throw error;
  }
}
