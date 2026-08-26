import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { isAdminRole, isStaffRole, normalizeRole, type Role } from "@/lib/platform/enums";

/**
 * Contrôle d'accès — source unique de vérité.
 *
 * Toute page et toute route d'API passent par ces gardes. Deux règles y sont
 * tenues sans exception :
 *
 * 1. **Le rôle vient de la session serveur**, jamais du corps de la requête ni
 *    d'un cookie interprété côté client. Un navigateur ne peut donc pas
 *    s'attribuer `admin`.
 * 2. **La propriété d'un objet se résout côté serveur.** Un identifiant reçu
 *    du navigateur ne sert qu'à *chercher* un document ; c'est la requête qui
 *    porte la condition d'appartenance, pas une comparaison faite après coup
 *    sur un document déjà chargé et déjà renvoyé.
 */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
};

export type PlatformSession = { user: SessionUser };

/** Session courante, ou `null` si absente, invalide ou base injoignable. */
export async function readPlatformSession(): Promise<PlatformSession | null> {
  try {
    const session = await getAuth().api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    const user = session.user as {
      id?: unknown;
      name?: unknown;
      email?: unknown;
      role?: unknown;
      emailVerified?: unknown;
    };
    const id = String(user.id ?? "");
    if (!id) return null;
    return {
      user: {
        id,
        name: String(user.name ?? ""),
        email: String(user.email ?? "").toLowerCase(),
        role: normalizeRole(user.role),
        emailVerified: user.emailVerified === true,
      },
    };
  } catch {
    // Authentification non configurée ou base injoignable : traité comme une
    // absence de session, jamais comme un accès autorisé.
    return null;
  }
}

/**
 * Chemin de retour sûr.
 *
 * Seul un chemin interne est accepté. `//exemple.com` et `https://exemple.com`
 * sont rejetés : le premier est une URL protocole-relative, et les deux
 * transformeraient la page de connexion en tremplin de redirection ouverte.
 */
export function safeNextPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) return fallback;
  return trimmed;
}

/* ------------------------------------------------------------------ */
/* Gardes de pages                                                     */
/* ------------------------------------------------------------------ */

/**
 * Garde de l'espace client.
 *
 * Un visiteur non connecté est renvoyé vers la connexion **avec** le chemin
 * demandé, pour y revenir une fois authentifié. Un administrateur reste le
 * bienvenu : il doit pouvoir vérifier ce que voient ses clients.
 */
export async function requireClientPage(loginPath: string, currentPath: string): Promise<PlatformSession> {
  const session = await readPlatformSession();
  if (!session) redirect(`${loginPath}?suivant=${encodeURIComponent(currentPath)}`);
  return session;
}

/* ------------------------------------------------------------------ */
/* Gardes de routes d'API                                              */
/* ------------------------------------------------------------------ */

const unauthorized = () => NextResponse.json({ error: "Authentification requise." }, { status: 401 });
const forbidden = (message: string) => NextResponse.json({ error: message }, { status: 403 });

export type ApiGuard<T> = { session: T } | { denied: NextResponse };

export function isDenied<T>(result: ApiGuard<T>): result is { denied: NextResponse } {
  return "denied" in result;
}

/** Exige un compte connecté, quel que soit son rôle. */
export async function requireSessionApi(): Promise<ApiGuard<PlatformSession>> {
  const session = await readPlatformSession();
  if (!session) return { denied: unauthorized() };
  return { session };
}

/** Exige un compte d'administration. */
export async function requireAdminSessionApi(): Promise<ApiGuard<PlatformSession>> {
  const session = await readPlatformSession();
  if (!session) return { denied: unauthorized() };
  if (!isAdminRole(session.user.role)) return { denied: forbidden("Accès réservé aux administrateurs.") };
  return { session };
}

/** Exige un membre de l'équipe (administration ou rédaction). */
export async function requireStaffSessionApi(): Promise<ApiGuard<PlatformSession>> {
  const session = await readPlatformSession();
  if (!session) return { denied: unauthorized() };
  if (!isStaffRole(session.user.role)) return { denied: forbidden("Accès réservé à l'équipe.") };
  return { session };
}

/**
 * Réponse « introuvable » pour un objet qui existe mais ne vous appartient pas.
 *
 * Renvoyer 403 confirmerait l'existence du dossier d'un autre client :
 * l'énumération des identifiants deviendrait un outil de reconnaissance. 404
 * ne distingue pas « inexistant » de « pas à vous ».
 */
export const notFoundResponse = () => NextResponse.json({ error: "Introuvable." }, { status: 404 });

export { isAdminRole, isStaffRole, normalizeRole };
