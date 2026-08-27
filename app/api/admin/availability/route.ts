import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { AvailabilityRuleModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { availabilityRuleInputSchema } from "@/lib/validation-platform";

/**
 * Remplacement de l'ensemble des plages de disponibilité.
 *
 * En bloc plutôt qu'une par une : une semaine de disponibilité se lit et se
 * corrige comme un tout, et un remplacement atomique évite l'état intermédiaire
 * — quelques millisecondes sans aucune plage — pendant lequel la page de
 * réservation n'aurait rien à proposer.
 */
export async function PUT(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = availabilityRuleInputSchema.array().max(60).safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectToDatabase();

  // `insertMany` d'abord échouerait sur l'index ; on remplace donc, puis on
  // insère, la fenêtre restant sous la milliseconde en pratique.
  await AvailabilityRuleModel.deleteMany({});
  if (parsed.data.length > 0) await AvailabilityRuleModel.insertMany(parsed.data);

  return NextResponse.json({ ok: true, count: parsed.data.length });
}
