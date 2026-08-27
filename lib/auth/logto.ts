import { UserScope, type LogtoNextConfig } from "@logto/next";

/**
 * Configuration Logto — fournisseur d'identité unique du projet.
 *
 * Depuis la bascule, le serveur ne détient plus aucun secret d'authentification :
 * ni mot de passe, ni session émise par nous, ni état de rôle. Logto détient les
 * comptes, les facteurs, la vérification d'adresse, la réinitialisation de mot de
 * passe et l'attribution des rôles.
 *
 * Ce que le serveur continue de faire — et doit faire — c'est *vérifier* le jeton
 * qu'il reçoit et refuser ce qui n'est pas autorisé. Une API d'administration qui
 * servirait ses données sans regarder la revendication `roles` serait ouverte à
 * tous : déléguer l'identité n'est pas déléguer le contrôle d'accès.
 *
 * La configuration est **paresseuse**. Évaluée à l'import, elle ferait échouer
 * `next build` sur une machine sans secrets — alors que la compilation n'a aucun
 * besoin de joindre Logto.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} est requis pour l'authentification Logto.`);
  return value;
}

export function logtoConfig(): LogtoNextConfig {
  return {
    endpoint: requireEnv("LOGTO_ENDPOINT"),
    appId: requireEnv("LOGTO_APP_ID"),
    appSecret: requireEnv("LOGTO_APP_SECRET"),
    baseUrl: requireEnv("NEXT_PUBLIC_SITE_URL"),
    cookieSecret: requireEnv("LOGTO_COOKIE_SECRET"),
    // Un cookie de session sans `Secure` en production voyagerait en clair.
    cookieSecure: process.env.NODE_ENV === "production",
    /*
     * `UserScope.Roles` est ce qui fait apparaître la revendication `roles` dans
     * l'ID token. Sans elle, `claims.roles` est absent et tout le monde retombe
     * sur `customer` — l'application semblerait fonctionner, mais aucun
     * administrateur ne pourrait plus entrer.
     */
    scopes: [UserScope.Email, UserScope.Profile, UserScope.Roles],
  };
}

/** `true` si l'authentification est configurée — pour répondre 503 plutôt que planter. */
export function isLogtoConfigured(): boolean {
  return Boolean(
    process.env.LOGTO_ENDPOINT &&
      process.env.LOGTO_APP_ID &&
      process.env.LOGTO_APP_SECRET &&
      process.env.LOGTO_COOKIE_SECRET &&
      process.env.NEXT_PUBLIC_SITE_URL,
  );
}

/** URI de rappel enregistrée dans la console Logto. */
export function callbackUri(): string {
  return new URL("/api/auth/callback", requireEnv("NEXT_PUBLIC_SITE_URL")).toString();
}
