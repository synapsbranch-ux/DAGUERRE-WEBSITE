import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type AdminSession = { user: AdminUser };

/** Lecture de la session Better Auth depuis les en-têtes de la requête courante. */
export async function readSession(): Promise<AdminSession | null> {
  try {
    const session = await getAuth().api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    const user = session.user as { id?: string; name?: string; email?: string; role?: string };
    return {
      user: {
        id: String(user.id ?? ""),
        name: String(user.name ?? ""),
        email: String(user.email ?? ""),
        role: String(user.role ?? "user"),
      },
    };
  } catch {
    // Authentification non configurée ou base injoignable : traité comme une
    // absence de session, jamais comme un accès autorisé.
    return null;
  }
}

/**
 * Garde des **pages** d'administration : redirige vers la connexion.
 *
 * Renvoie la session pour que le layout puisse afficher l'utilisateur connecté
 * sans la relire.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await readSession();
  if (!session) redirect("/connexion");
  if (session.user.role !== "admin") redirect("/connexion?error=forbidden");
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
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }
  return null;
}
