import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import {
  isAdminRole,
  readPlatformSession,
  type PlatformSession,
} from "@/lib/platform/access";

export type AdminUser = PlatformSession["user"];
export type AdminSession = PlatformSession;

/**
 * Gardes du tableau de bord.
 *
 * La lecture de session vit désormais dans `lib/platform/access.ts`, partagée
 * avec l'espace client : une seule implémentation normalise le rôle, donc une
 * seule règle décide qui est administrateur.
 */

/** Lecture de la session Better Auth depuis les en-têtes de la requête courante. */
export async function readSession(): Promise<AdminSession | null> {
  return readPlatformSession();
}

/**
 * Garde des **pages** d'administration : redirige vers la connexion.
 *
 * Renvoie la session pour que le layout puisse afficher l'utilisateur connecté
 * sans la relire.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await readSession();
  if (!session) redirect("/connexion?suivant=%2Fadmin");
  if (!isAdminRole(session.user.role)) redirect("/connexion?error=forbidden");
  return session;
}

/**
 * Garde des **routes API**.
 *
 * `requireAdmin()` lève un `NEXT_REDIRECT` : au milieu d'un gestionnaire JSON,
 * cela produit une réponse de redirection incompréhensible pour un client
 * `fetch`. On renvoie donc un statut explicite — 401 sans session, 403 si le
 * rôle n'est pas `admin` — et `null` quand l'accès est accordé.
 *
 * Le lecteur de session est injectable pour permettre de tester le refus sans
 * serveur d'authentification.
 */
export async function requireAdminApi(
  read: () => Promise<AdminSession | null> = readSession,
): Promise<NextResponse | null> {
  const session = await read();
  if (!session) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }
  return null;
}
