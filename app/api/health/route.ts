import { NextResponse } from "next/server";

import { isLogtoConfigured } from "@/lib/auth/logto";
import { isManagementConfigured } from "@/lib/auth/management";
import { tryConnectToDatabase } from "@/lib/db/client";
import { isEmailConfigured } from "@/lib/email/provider";
import { isSharedRateLimitConfigured } from "@/lib/rate-limit";
import { isPlaceholderSiteUrl } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * État de santé du service.
 *
 * Répond à la question qu'on se pose au déploiement — « qu'est-ce qui manque
 * encore ? » — sans qu'il faille parcourir les journaux ou tenter un parcours
 * complet pour découvrir qu'une variable est absente.
 *
 * **Aucun secret n'est divulgué** : chaque entrée est un booléen ou un état,
 * jamais une valeur, une URL interne ou un fragment de clé. Le point d'entrée
 * est public parce qu'un sonde d'hébergeur doit pouvoir l'appeler sans
 * identifiants ; il ne doit donc rien apprendre à un visiteur qu'un simple
 * essai de connexion n'apprendrait déjà.
 *
 * `degraded` plutôt que `down` quand seule une dépendance secondaire manque :
 * le site public reste consultable sans courriel ni Redis, et une sonde ne doit
 * pas faire redémarrer un service qui sert correctement ses pages.
 */
export async function GET() {
  const database = await tryConnectToDatabase();

  const checks = {
    database,
    // Figée à la compilation : seule la constante résolue peut la trahir.
    canonicalUrl: !isPlaceholderSiteUrl(),
    auth: isLogtoConfigured(),
    authManagement: isManagementConfigured(),
    email: isEmailConfigured(),
    adminAlerts: Boolean(process.env.ADMIN_NOTIFICATION_EMAIL),
    scheduler: Boolean(process.env.CRON_SECRET),
    emailWebhook: Boolean(process.env.RESEND_WEBHOOK_SECRET),
    authWebhook: Boolean(process.env.LOGTO_WEBHOOK_SIGNING_KEY),
    sharedRateLimit: isSharedRateLimitConfigured(),
    tokenSecret: Boolean(process.env.APP_TOKEN_SECRET || process.env.BETTER_AUTH_SECRET),
  };

  /*
   * Sans base ni authentification, rien de ce que fait la plate-forme ne
   * fonctionne : c'est une panne, pas une dégradation.
   */
  const essential = checks.database && checks.auth && checks.tokenSecret;
  const complete = Object.values(checks).every(Boolean);

  const status = essential ? (complete ? "ok" : "degraded") : "down";

  return NextResponse.json(
    { status, checks },
    {
      status: essential ? 200 : 503,
      // Une réponse de santé mise en cache décrit l'état d'hier.
      headers: { "cache-control": "no-store" },
    },
  );
}
