import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/client";
import { NewsletterSubscriberModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { isDenied, requireSessionApi } from "@/lib/platform/access";
import { getClientProfile } from "@/lib/platform/client";
import { subscribeToNewsletter } from "@/lib/platform/newsletter";
import { marketingPreferenceSchema } from "@/lib/validation-platform";

/**
 * Préférence marketing du client connecté.
 *
 * Elle porte sur **l'adresse du compte**, résolue depuis la session : un client
 * ne peut ni abonner ni désabonner l'adresse d'un tiers depuis son espace.
 *
 * Se désabonner ici ne coupe aucun courriel de service : confirmations de
 * devis, propositions et notifications de message continuent d'arriver. Ce
 * sont deux catégories distinctes, et les confondre priverait un client
 * d'informations contractuelles.
 */
export async function POST(request: Request) {
  const guard = await requireSessionApi();
  if (isDenied(guard)) return guard.denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = marketingPreferenceSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });

  await connectToDatabase();
  const { email, id, name } = guard.session.user;

  if (!parsed.data.subscribed) {
    await NewsletterSubscriberModel.updateOne(
      { email },
      { $set: { status: "unsubscribed", unsubscribedAt: new Date() } },
    );
    return NextResponse.json({ ok: true, subscribed: false });
  }

  const profile = await getClientProfile(id);
  const outcome = await subscribeToNewsletter({
    email,
    firstName: profile?.firstName || name.split(" ")[0] || "",
    lastName: profile?.lastName ?? "",
    source: "client_portal",
    locale: profile?.preferredLanguage ?? "fr",
    userId: id,
  });

  if (outcome.result === "error") return NextResponse.json({ error: outcome.message }, { status: 503 });
  return NextResponse.json({ ok: true, subscribed: true, outcome });
}
