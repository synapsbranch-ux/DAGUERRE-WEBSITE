import { MongoClient } from "mongodb";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";

import { resetPasswordEmail, verifyEmailEmail } from "@/lib/email/templates";
import { publicUrl, sendTransactionalEmail } from "@/lib/email/service";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";

// MongoClient is deliberately lazy: constructing it does not open a socket.
// This keeps static builds possible without deployment secrets while every
// runtime auth operation still fails clearly until MONGODB_URI is configured.
// Keep configuration failures explicit.  The development defaults previously
// made it far too easy to deploy an instance protected by a known secret.

/**
 * Langue du destinataire, déduite de la requête qui déclenche l'envoi.
 *
 * Better Auth ne transporte pas la locale : on la retrouve dans le chemin de
 * retour demandé (`/en/...`) ou, à défaut, dans l'en-tête `Accept-Language`.
 * Sans cela, un anglophone recevrait ses courriels de compte en français.
 */
function localeFromRequest(request?: Request): Locale {
  if (!request) return defaultLocale;

  try {
    const url = new URL(request.url);
    const fromQuery = url.searchParams.get("redirectTo") ?? url.searchParams.get("callbackURL");
    const candidate = (fromQuery ?? url.pathname).split("/").filter(Boolean)[0] ?? "";
    if (isLocale(candidate)) return candidate;
  } catch {
    // URL illisible : on retombe sur l'en-tête, puis sur le français.
  }

  const header = request.headers.get("accept-language")?.slice(0, 2).toLowerCase() ?? "";
  return isLocale(header) ? header : defaultLocale;
}

export function getAuth() {
  const uri = process.env.MONGODB_URI;
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!uri || !secret || !baseURL) throw new Error("Authentification non configurée : MONGODB_URI, BETTER_AUTH_SECRET et BETTER_AUTH_URL sont requis.");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
  return betterAuth({
  database: mongodbAdapter(client.db(), { client, transaction: false }),
  secret,
  baseURL,
  /**
   * L'inscription est ouverte parce que l'espace client l'exige : un prospect
   * doit pouvoir créer son compte pour suivre un devis.
   *
   * Elle ne crée **que** des comptes clients. Le rôle est un champ
   * `input: false` avec une valeur par défaut serveur : aucune requête
   * d'inscription ne peut demander `admin`, quelle que soit sa charge utile.
   * Les comptes d'administration se créent hors ligne, par
   * `pnpm bootstrap:admin`.
   */
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 10,
    /*
     * La vérification d'adresse est envoyée mais n'est pas bloquante : sans
     * fournisseur de courriel configuré, l'exiger enfermerait chaque nouveau
     * compte dehors. L'espace client signale l'adresse non vérifiée.
     */
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }, request) => {
      const locale = localeFromRequest(request);
      await sendTransactionalEmail(
        user.email,
        resetPasswordEmail(locale, { name: user.name || user.email, url }),
      );
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, request) => {
      const locale = localeFromRequest(request);
      await sendTransactionalEmail(
        user.email,
        verifyEmailEmail(locale, { name: user.name || user.email, url }),
      );
    },
  },
  user: { additionalFields: { role: { type: "string", required: false, defaultValue: "client", input: false } } },
  /**
   * Limitation de débit des points d'entrée d'authentification.
   *
   * Better Auth n'active la sienne qu'en production ; on l'active partout
   * pour que le comportement testé soit celui qui sera servi. Les règles
   * particulières visent les trois portes que l'on attaque : la connexion
   * (force brute), l'inscription (création de comptes en masse) et la
   * réinitialisation (envoi de courriels à des tiers).
   *
   * Le stockage est en mémoire du processus : suffisant pour une instance,
   * à doubler d'une limitation en périphérie sur un déploiement réparti.
   */
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 300, max: 10 },
      "/sign-up/email": { window: 3600, max: 5 },
      "/request-password-reset": { window: 3600, max: 5 },
      "/reset-password": { window: 3600, max: 10 },
      "/send-verification-email": { window: 3600, max: 5 },
    },
  },
  plugins: [nextCookies()],
  });
}

/** Chemin de retour utilisé par le lien de réinitialisation. */
export function resetPasswordRedirect(locale: Locale): string {
  return publicUrl("resetPassword", locale);
}
