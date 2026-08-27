import { timingSafeEqual } from "node:crypto";

/**
 * Accès des tâches planifiées.
 *
 * Deux voies : l'en-tête `authorization: Bearer <CRON_SECRET>` pour un
 * planificateur, ou une session d'administration pour une relance manuelle.
 * Sans `CRON_SECRET` configuré, la voie automatique est **fermée** : un point
 * d'entrée qui déclenche des envois de masse et des changements de statut, s'il
 * était ouvert, serait une arme.
 *
 * La comparaison est faite en temps constant. Comparer deux chaînes avec `===`
 * s'arrête au premier caractère différent, et cette durée se mesure : un
 * attaquant patient devine le secret caractère par caractère.
 */
export function hasCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (provided.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
