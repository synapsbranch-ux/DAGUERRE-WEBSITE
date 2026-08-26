import { NotificationModel } from "@/lib/db/models/platform";
import type { NotificationType } from "@/lib/platform/enums";

/**
 * Notifications dans l'application.
 *
 * Elles doublent les courriels transactionnels sans les remplacer : un client
 * qui a désactivé ses courriels doit retrouver l'information en se connectant,
 * et un client qui ne se connecte jamais doit être prévenu par courriel.
 *
 * `href` est toujours un chemin **interne** : le centre de notifications ne
 * doit pas pouvoir devenir un vecteur de redirection vers un domaine tiers.
 */
export async function notify(entry: {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  href?: string;
}): Promise<void> {
  if (!entry.userId) return;

  const href =
    typeof entry.href === "string" && entry.href.startsWith("/") && !entry.href.startsWith("//")
      ? entry.href
      : "";

  try {
    await NotificationModel.create({
      userId: entry.userId,
      type: entry.type,
      title: entry.title.slice(0, 200),
      message: (entry.message ?? "").slice(0, 1000),
      href,
    });
  } catch (error) {
    console.error("[notifications] écriture impossible :", error);
  }
}

/** Nombre de notifications non lues — alimente la pastille de navigation. */
export async function unreadNotificationCount(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    return await NotificationModel.countDocuments({ userId, readAt: null });
  } catch {
    return 0;
  }
}
