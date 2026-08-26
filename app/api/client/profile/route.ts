import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/client";
import { ClientProfileModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { isDenied, requireSessionApi } from "@/lib/platform/access";
import { clientProfileInputSchema } from "@/lib/validation-platform";

/**
 * Mise à jour du profil client.
 *
 * L'identifiant du compte vient **de la session**, jamais du corps de la
 * requête : sans cela, il suffirait d'envoyer le `userId` d'un autre client
 * pour réécrire sa fiche.
 */
export async function PATCH(request: Request) {
  const guard = await requireSessionApi();
  if (isDenied(guard)) return guard.denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = clientProfileInputSchema.safeParse(json.data);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  await connectToDatabase();
  await ClientProfileModel.findOneAndUpdate(
    { userId: guard.session.user.id },
    { $set: parsed.data },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return NextResponse.json({ ok: true });
}
