import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Jetons signés, sans stockage.
 *
 * Un lien de désabonnement, une confirmation d'inscription ou une invitation à
 * réclamer un devis sont des **capacités** : leur seule possession autorise
 * l'action. Plutôt que de conserver une table de jetons à faire expirer et à
 * purger, on signe la charge utile avec le secret de l'application.
 *
 * - impossible à forger sans le secret (HMAC-SHA-256) ;
 * - impossible à rejouer pour un autre usage (`purpose` entre dans la
 *   signature : un jeton de désabonnement ne confirmera jamais une
 *   inscription) ;
 * - expiration portée par le jeton lui-même.
 *
 * Ce mécanisme n'est **pas** un substitut à l'authentification : il n'accorde
 * qu'une action précise sur un objet précis.
 */

const SEPARATOR = ".";

type Payload = {
  /** Usage du jeton — entre dans la signature. */
  p: string;
  /** Sujet : identifiant de l'objet visé. */
  s: string;
  /** Expiration en secondes epoch ; `0` pour un jeton permanent. */
  e: number;
};

function secret(): string {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error("BETTER_AUTH_SECRET est requis pour signer les jetons.");
  return value;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

/** Comparaison à temps constant — une comparaison `===` fuit la position du premier octet faux. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Fabrique un jeton pour un usage et un sujet donnés.
 *
 * `ttlSeconds` à `0` produit un jeton permanent : c'est le cas du lien de
 * désabonnement, qui doit rester valide dans une infolettre archivée depuis
 * des mois.
 */
export function createToken(purpose: string, subject: string, ttlSeconds = 0): string {
  const payload: Payload = {
    p: purpose,
    s: subject,
    e: ttlSeconds > 0 ? Math.floor(Date.now() / 1000) + ttlSeconds : 0,
  };
  const body = base64url(JSON.stringify(payload));
  return `${body}${SEPARATOR}${sign(body)}`;
}

/**
 * Vérifie un jeton et renvoie le sujet, ou `null`.
 *
 * Renvoie `null` — jamais une exception — pour toute anomalie : signature
 * invalide, usage détourné, expiration, secret absent. L'appelant traite donc
 * un jeton falsifié exactement comme un jeton périmé.
 */
export function readToken(purpose: string, token: string | null | undefined): string | null {
  if (!token || typeof token !== "string") return null;

  const index = token.indexOf(SEPARATOR);
  if (index <= 0 || index === token.length - 1) return null;

  const body = token.slice(0, index);
  const signature = token.slice(index + 1);

  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return null;
  }
  if (!safeEqual(signature, expected)) return null;

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
  } catch {
    return null;
  }

  if (payload.p !== purpose) return null;
  if (typeof payload.s !== "string" || !payload.s) return null;
  if (payload.e && payload.e < Math.floor(Date.now() / 1000)) return null;

  return payload.s;
}

/** Usages déclarés — centralisés pour éviter les fautes de frappe silencieuses. */
export const tokenPurpose = {
  newsletterConfirm: "newsletter:confirm",
  newsletterUnsubscribe: "newsletter:unsubscribe",
  quoteClaim: "quote:claim",
} as const;

/** Durée de validité d'une confirmation d'inscription : sept jours. */
export const CONFIRM_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Durée de validité d'une invitation à réclamer un devis : trente jours. */
export const CLAIM_TTL_SECONDS = 30 * 24 * 60 * 60;
