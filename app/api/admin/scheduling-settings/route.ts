import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { SchedulingSettingsModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { schedulingSettingsSchema } from "@/lib/validation-platform";

/** Réglages de l'agenda — fuseau de référence, avis, organisateur. */
export async function PUT(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = schedulingSettingsSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();

  await SchedulingSettingsModel.updateOne(
    { key: "scheduling" },
    { $set: { ...parsed.data, key: "scheduling" } },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
