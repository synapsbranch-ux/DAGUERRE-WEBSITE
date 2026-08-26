import { createHash } from "node:crypto";

/**
 * Empreinte de soumission.
 *
 * Un double-clic, une reprise réseau ou un `POST` rejoué par le navigateur ne
 * doivent pas créer deux demandes de devis identiques. Le formulaire fournit
 * un identifiant de soumission tiré au hasard ; le serveur en stocke
 * l'empreinte sous un index unique, et un second envoi porteur du même
 * identifiant retrouve la demande déjà créée au lieu d'en fabriquer une autre.
 *
 * Un client qui n'en fournit pas — script, client HTTP minimaliste — retombe
 * sur une empreinte dérivée du contenu et d'une fenêtre de dix minutes :
 * deux envois vraiment distincts restent possibles, un renvoi accidentel non.
 */

const WINDOW_MS = 10 * 60 * 1000;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 40);
}

export function submissionKeyFrom(submissionId: unknown, fallbackParts: string[], now = Date.now()): string {
  if (typeof submissionId === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(submissionId.trim())) {
    return digest(`id:${submissionId.trim()}`);
  }
  const window = Math.floor(now / WINDOW_MS);
  return digest(`content:${window}:${fallbackParts.join(" ")}`);
}

/** Code d'erreur MongoDB pour une violation d'index unique. */
export const DUPLICATE_KEY = 11000;

export function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === DUPLICATE_KEY;
}
