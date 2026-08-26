import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/client";
import { NotificationModel } from "@/lib/db/models/platform";
import { readJson, validObjectId } from "@/lib/http";
import { isDenied, requireSessionApi } from "@/lib/platform/access";

/**
 * Marquage des notifications comme lues.
 *
 * L'identifiant du compte vient de la session : `updateMany` porte toujours
 * `userId`, donc marquer « tout lu » ne peut jamais toucher la boîte d'un
 * autre client, quel que soit le corps envoyé.
 */
export async function POST(request: Request) {
  const guard = await requireSessionApi();
  if (isDenied(guard)) return guard.denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const body = json.data as { id?: unknown; all?: unknown };
  const userId = guard.session.user.id;
  const now = new Date();

  await connectToDatabase();

  if (body.all === true) {
    const result = await NotificationModel.updateMany(
      { userId, readAt: null },
      { $set: { readAt: now } },
    );
    return NextResponse.json({ ok: true, updated: result.modifiedCount ?? 0 });
  }

  if (typeof body.id !== "string" || !validObjectId(body.id)) {
    return NextResponse.json({ error: "Notification invalide." }, { status: 400 });
  }

  const result = await NotificationModel.updateOne(
    { _id: body.id, userId, readAt: null },
    { $set: { readAt: now } },
  );

  return NextResponse.json({ ok: true, updated: result.modifiedCount ?? 0 });
}
