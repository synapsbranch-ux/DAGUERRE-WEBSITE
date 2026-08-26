import { cache } from "react";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { getLogtoContext } from "@logto/next/server-actions";

import { logtoConfig } from "@/lib/auth/logto";
import { roleFromClaims } from "@/lib/auth/roles";
import { isAdminRole, normalizeRole, type Role } from "@/lib/platform/enums";
import { safeNextPath } from "@/lib/platform/pathname";

/**
 * Contrôle d'accès — source unique de vérité.
 *
 * Toute page et toute route d'API passent par ces gardes. Deux règles y sont
 * tenues sans exception :
 *
 * 1. **Le rôle vient de la revendication signée par Logto**, jamais du corps de
 *    la requête ni d'un cookie interprété côté client. Un navigateur ne peut
 *    donc pas s'attribuer `admin`.
 * 2. **La propriété d'un objet se résout côté serveur.** Un identifiant reçu
 *    du navigateur ne sert qu'à *chercher* un document ; c'est la requête qui
 *    porte la condition d'appartenance, pas une comparaison faite après coup
 *    sur un document déjà chargé et déjà renvoyé.
 *
 * Depuis la bascule vers Logto, ce fichier est la **seule** couture entre le
 * fournisseur d'identité et le reste de l'application : `PlatformSession` garde
 * sa forme, et les soixante et quelques appelants n'ont pas eu à changer.
 */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
};

export type PlatformSession = { user: SessionUser };

/**
 * Session courante, ou `null` si absente, invalide ou Logto injoignable.
 *
 * Mémoïsée par `cache()` de React : une page qui appelle une garde puis une
 * requête de données déchiffrerait sinon le cookie de session plusieurs fois
 * dans le même rendu. C'est la couche d'accès aux données que recommande le
 * guide d'authentification de Next
 * (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`).
 */
export const readPlatformSession = cache(async (): Promise<PlatformSession | null> => {
  try {
    const context = await getLogtoContext(logtoConfig());
    if (!context.isAuthenticated) return null;

    const claims = context.claims;
    const id = typeof claims?.sub === "string" ? claims.sub : "";
    if (!id) return null;

    return {
      user: {
        id,
        // Un compte créé par courriel seul n'a ni nom ni pseudonyme : mieux vaut
        // afficher l'adresse qu'une chaîne vide dans le tableau de bord.
        name: String(claims?.name || claims?.username || claims?.email || ""),
        email: String(claims?.email ?? "").toLowerCase(),
        role: roleFromClaims(claims),
        emailVerified: claims?.email_verified === true,
      },
    };
  } catch {
    // Authentification non configurée, cookie illisible ou Logto injoignable :
    // traité comme une absence de session, jamais comme un accès autorisé.
    return null;
  }
});

export { safeNextPath };

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

/**
 * Réponse « introuvable » pour un objet qui existe mais ne vous appartient pas.
 *
 * Renvoyer 403 confirmerait l'existence du dossier d'un autre client :
 * l'énumération des identifiants deviendrait un outil de reconnaissance. 404
 * ne distingue pas « inexistant » de « pas à vous ».
 */
export const notFoundResponse = () => NextResponse.json({ error: "Introuvable." }, { status: 404 });

export { isAdminRole, normalizeRole };
