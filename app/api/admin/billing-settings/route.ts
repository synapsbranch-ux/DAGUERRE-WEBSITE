import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { BillingSettingsModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { billingSettingsSchema } from "@/lib/validation-platform";

/**
 * Identité fiscale de l'émetteur et valeurs par défaut.
 *
 * Ce que l'on enregistre ici **préremplit** les nouvelles factures ; cela ne
 * réécrit jamais celles déjà émises, qui portent leur propre copie. Changer un
 * taux de taxe l'an prochain laisse donc l'historique intact.
 */
export async function PUT(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = billingSettingsSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();

  await BillingSettingsModel.updateOne(
    { key: "billing" },
    { $set: { ...parsed.data, key: "billing" } },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
