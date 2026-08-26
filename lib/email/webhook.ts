import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Vérification des notifications du fournisseur d'envoi.
 *
 * Resend signe ses appels au format Svix : trois en-têtes — identifiant,
 * horodatage, signature — et une signature calculée sur
 * `id.timestamp.corps` avec le secret du point d'entrée.
 *
 * Sans cette vérification, n'importe qui pourrait déclarer une adresse en
 * rejet dur et faire cesser tout envoi vers elle. Un webhook non signé n'est
 * pas une notification : c'est une requête anonyme.
 */

/** Fenêtre acceptée autour de l'horodatage, contre le rejeu. */
const TOLERANCE_SECONDS = 5 * 60;

export type WebhookCheck = { ok: true } | { ok: false; reason: string };

function decodeSecret(secret: string): Buffer {
  // Le secret Svix est distribué sous la forme `whsec_<base64>`.
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  return Buffer.from(raw, "base64");
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Valide la signature d'un appel entrant.
 *
 * `signatureHeader` peut contenir plusieurs signatures séparées par une
 * espace (rotation de secret) : il suffit qu'une seule corresponde.
 */
export function verifyWebhookSignature(options: {
  secret: string | undefined;
  id: string | null;
  timestamp: string | null;
  signatureHeader: string | null;
  body: string;
  now?: number;
}): WebhookCheck {
  const { secret, id, timestamp, signatureHeader, body } = options;

  if (!secret) return { ok: false, reason: "Secret de webhook non configuré." };
  if (!id || !timestamp || !signatureHeader) return { ok: false, reason: "En-têtes de signature absents." };

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return { ok: false, reason: "Horodatage illisible." };

  const now = Math.floor((options.now ?? Date.now()) / 1000);
  if (Math.abs(now - sentAt) > TOLERANCE_SECONDS) return { ok: false, reason: "Horodatage hors tolérance." };

  const expected = createHmac("sha256", decodeSecret(secret))
    .update(`${id}.${timestamp}.${body}`)
    .digest();

  const candidates = signatureHeader
    .split(" ")
    .map((entry) => entry.trim())
    .filter(Boolean)
    // Chaque entrée est de la forme `v1,<base64>`.
    .map((entry) => (entry.includes(",") ? entry.slice(entry.indexOf(",") + 1) : entry));

  for (const candidate of candidates) {
    try {
      if (safeEqual(Buffer.from(candidate, "base64"), expected)) return { ok: true };
    } catch {
      // Signature illisible : on passe à la suivante.
    }
  }

  return { ok: false, reason: "Signature invalide." };
}

/** Événements retenus — les autres sont acquittés sans effet. */
export const HANDLED_EVENTS = [
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.delivery_delayed",
] as const;

export type HandledEvent = (typeof HANDLED_EVENTS)[number];

export function isHandledEvent(value: unknown): value is HandledEvent {
  return typeof value === "string" && (HANDLED_EVENTS as readonly string[]).includes(value);
}
