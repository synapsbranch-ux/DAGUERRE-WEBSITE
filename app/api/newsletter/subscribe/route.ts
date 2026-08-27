import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/client";
import { clientIp, readJson } from "@/lib/http";
import { readPlatformSession } from "@/lib/platform/access";
import { subscribeToNewsletter } from "@/lib/platform/newsletter";
import { slidingWindow } from "@/lib/rate-limit";
import { newsletterSubscribeSchema } from "@/lib/validation-platform";

/**
 * Inscription publique à l'infolettre.
 *
 * Trois protections :
 *
 * 1. **Limitation de débit** par adresse IP — un formulaire d'inscription
 *    ouvert est une cible de choix pour inonder des tiers de courriels de
 *    confirmation.
 * 2. **Piège à pourriel** : le champ caché rempli renvoie un succès factice,
 *    sans rien écrire. Un robot ne saura pas qu'il a été écarté.
 * 3. **Consentement obligatoire** : le schéma exige `consent === true`.
 *
 * La réponse ne dit jamais si une adresse était déjà connue autrement que par
 * un message neutre : ce point d'entrée ne doit pas servir à tester
 * l'existence d'un abonné.
 */
export async function POST(request: Request) {
  if (!(await slidingWindow(`newsletter:${clientIp(request)}`, 5, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez plus tard." }, { status: 429 });
  }

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const parsed = newsletterSubscribeSchema.safeParse(json.data);
  if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  if (parsed.data.website) return NextResponse.json({ result: "created" }, { status: 201 });

  const session = await readPlatformSession();

  try {
    await connectToDatabase();
    const outcome = await subscribeToNewsletter({
      email: parsed.data.email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      source: parsed.data.source,
      locale: parsed.data.locale,
      // Le compte n'est rattaché que si l'adresse est bien celle du compte.
      userId: session && session.user.email === parsed.data.email ? session.user.id : undefined,
    });

    if (outcome.result === "error") {
      return NextResponse.json({ error: outcome.message }, { status: 503 });
    }

    return NextResponse.json(outcome, { status: 201 });
  } catch {
    return NextResponse.json({ error: "L'inscription n'a pas pu être enregistrée." }, { status: 503 });
  }
}
