import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Vérification des notifications (« hooks ») de Logto.
 *
 * Logto signe chaque appel avec l'en-tête `logto-signature-sha-256` : un
 * HMAC-SHA256 du **corps brut**, encodé en hexadécimal, calculé avec la clé de
 * signature du hook.
 *
 * Sans cette vérification, n'importe qui pourrait déclarer un compte créé,
 * supprimé ou suspendu dans notre miroir. Un webhook non signé n'est pas une
 * notification : c'est une requête anonyme.
 */

export const LOGTO_SIGNATURE_HEADER = "logto-signature-sha-256";

export type WebhookCheck = { ok: true } | { ok: false; reason: string };

export function verifyLogtoSignature(options: {
  secret: string | undefined;
  signature: string | null;
  body: string;
}): WebhookCheck {
  const { secret, signature, body } = options;

  if (!secret) return { ok: false, reason: "Clé de signature de webhook non configurée." };
  if (!signature) return { ok: false, reason: "En-tête de signature absent." };

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const received = Buffer.from(signature.trim(), "utf8");
  const reference = Buffer.from(expected, "utf8");

  // La comparaison de longueur d'abord : `timingSafeEqual` lève sur des tampons
  // de tailles différentes.
  if (received.length !== reference.length) return { ok: false, reason: "Signature invalide." };
  if (!timingSafeEqual(received, reference)) return { ok: false, reason: "Signature invalide." };

  return { ok: true };
}

/** Événements retenus — les autres sont acquittés sans effet. */
export const HANDLED_LOGTO_EVENTS = [
  "User.Created",
  "User.Data.Updated",
  "User.Deleted",
  "User.SuspensionStatus.Updated",
] as const;

export type HandledLogtoEvent = (typeof HANDLED_LOGTO_EVENTS)[number];

export function isHandledLogtoEvent(value: unknown): value is HandledLogtoEvent {
  return typeof value === "string" && (HANDLED_LOGTO_EVENTS as readonly string[]).includes(value);
}
