import { NextResponse } from "next/server";

/**
 * Lecture d'une date de départ programmée.
 *
 * Une date passée est **refusée**, jamais lancée immédiatement. Elle vient
 * presque toujours d'une faute de frappe ou d'une erreur de fuseau, et un envoi
 * de masse n'est pas une opération sur laquelle on veut deviner l'intention.
 *
 * Une petite tolérance couvre le trajet entre le navigateur et le serveur :
 * programmer « dans une minute » ne doit pas être rejeté parce que la requête a
 * mis trois secondes à arriver.
 */
const TOLERANCE_MS = 60_000;

export type ScheduleRead = { at: Date | null } | { error: NextResponse };

export function readSchedule(value: string | undefined, now = Date.now()): ScheduleRead {
  if (!value) return { at: null };

  const at = new Date(value);
  if (Number.isNaN(at.getTime())) {
    return { error: NextResponse.json({ error: "Date de départ illisible." }, { status: 400 }) };
  }

  if (at.getTime() < now - TOLERANCE_MS) {
    return {
      error: NextResponse.json(
        { error: "La date de départ est déjà passée. Corrigez-la ou laissez le champ vide." },
        { status: 400 },
      ),
    };
  }

  return { at };
}
