import { NextResponse } from "next/server";

import { tryConnectToDatabase } from "@/lib/db/client";
import { CalendarEventModel } from "@/lib/db/models/platform";
import { clientIp } from "@/lib/http";
import { isCalendarFeedToken } from "@/lib/platform/bookings";
import { renderCalendar, type CalendarEntry } from "@/lib/platform/ics";
import { slidingWindow } from "@/lib/rate-limit";

export const runtime = "nodejs";

type Doc = Record<string, unknown>;

/** Fenêtre publiée : le passé récent pour le contexte, l'avenir pour l'usage. */
const PAST_DAYS = 30;
const FUTURE_DAYS = 365;

/**
 * Flux iCalendar de l'agenda.
 *
 * ## Pourquoi un jeton dans l'URL plutôt qu'une session
 *
 * Un agenda de bureau récupère ce flux **tout seul**, périodiquement, sans
 * navigateur et sans cookie. Une garde de session le rendrait donc inutilisable.
 * Le jeton signé est la seule autorisation qui survive à ce contexte.
 *
 * En contrepartie, il est traité comme un secret : lecture seule, aucun autre
 * usage possible — le `purpose` entre dans la signature —, et l'URL n'a rien à
 * faire dans un message public.
 *
 * ## Ce que le flux ne contient pas
 *
 * Ni notes internes, ni coordonnées : seulement le titre, le lieu et les heures.
 * Un flux d'agenda finit par vivre dans des applications que nous ne contrôlons
 * pas, parfois synchronisées ailleurs.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  if (!isCalendarFeedToken(url.searchParams.get("jeton"))) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 404 });
  }

  if (!(await slidingWindow(`ics:${clientIp(request)}`, 60, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  if (!(await tryConnectToDatabase())) {
    return NextResponse.json({ error: "Service indisponible." }, { status: 503 });
  }

  const day = 24 * 60 * 60_000;
  const from = new Date(Date.now() - PAST_DAYS * day);
  const to = new Date(Date.now() + FUTURE_DAYS * day);

  const docs = (await CalendarEventModel.find({ startAt: { $gte: from, $lte: to } })
    .sort({ startAt: 1 })
    .limit(2000)
    .lean()) as Doc[];

  const entries: CalendarEntry[] = docs.map((doc) => ({
    id: String(doc._id),
    title: String(doc.title ?? ""),
    location: String(doc.location ?? ""),
    start: doc.startAt instanceof Date ? doc.startAt : new Date(String(doc.startAt)),
    end: doc.endAt instanceof Date ? doc.endAt : new Date(String(doc.endAt)),
  }));

  /*
   * Un agenda vide reste un agenda valide. Répondre une erreur ferait afficher
   * « abonnement rompu » dans l'application du destinataire, alors qu'il n'y a
   * simplement rien de prévu.
   */
  const value =
    entries.length > 0
      ? renderCalendar(entries, "PUBLISH")
      : "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nCALSCALE:GREGORIAN\r\nPRODID:daguerre/ics\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:Daguerre\r\nEND:VCALENDAR";

  if (!value) return NextResponse.json({ error: "Agenda indisponible." }, { status: 503 });

  return new NextResponse(value, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="agenda.ics"',
      // Le jeton est dans l'URL : aucun cache partagé ne doit en garder copie.
      "cache-control": "private, no-store",
    },
  });
}
