import { tryConnectToDatabase } from "@/lib/db/client";
import { ClientProfileModel } from "@/lib/db/models/platform";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { isAdminRole } from "@/lib/platform/enums";
import { safeNextPath } from "@/lib/platform/pathname";
import { href } from "@/lib/routes";

/**
 * Destination après authentification.
 *
 * Le navigateur ne décide pas où il atterrit : le serveur répond à partir du
 * rôle réel de la session. Un chemin demandé n'est retenu que s'il désigne une
 * page interne — `safeNextPath` écarte les formes de redirection ouverte.
 *
 * Extrait de la route d'API pour que la route de rappel de Logto l'appelle
 * directement, sans aller-retour réseau supplémentaire au moment précis où
 * l'utilisateur attend d'être redirigé.
 */
export async function landingHref(
  user: { id: string; role: string },
  requestedPath: unknown,
): Promise<string> {
  const requested = safeNextPath(requestedPath, "");
  if (requested) return requested;

  if (isAdminRole(user.role)) return "/admin";

  return href("portal", await preferredLocale(user.id));
}

/** Langue de correspondance du client, quand son profil en déclare une. */
export async function preferredLocale(userId: string): Promise<Locale> {
  if (!(await tryConnectToDatabase())) return defaultLocale;

  try {
    const profile = (await ClientProfileModel.findOne({ userId })
      .select("preferredLanguage")
      .lean()) as { preferredLanguage?: string } | null;
    const value = profile?.preferredLanguage ?? "";
    return isLocale(value) ? value : defaultLocale;
  } catch {
    return defaultLocale;
  }
}
