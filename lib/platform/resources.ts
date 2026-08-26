import { publicUrl, sendTransactionalEmail } from "@/lib/email/service";
import { resourceAvailableEmail } from "@/lib/email/templates";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";
import { getClientProfile } from "@/lib/platform/client";
import { notify } from "@/lib/platform/notifications";
import { findAccount } from "@/lib/platform/users";
import { href } from "@/lib/routes";

/**
 * Annonce d'une ressource réservée.
 *
 * Seules les ressources de portée `private` déclenchent une annonce, et
 * uniquement vers les comptes qu'elles nomment. Publier un guide public
 * n'écrit à personne : une bibliothèque qui notifie tout le monde à chaque
 * publication devient une source d'agacement, puis de signalements pour
 * pourriel.
 *
 * L'envoi est « au mieux » : un destinataire injoignable ne fait pas échouer
 * la publication, qui a déjà eu lieu.
 */
export async function announceRestrictedResource(resource: {
  slug: string;
  title: string;
  visibility: string;
  status: string;
  allowedUserIds: string[];
}): Promise<number> {
  if (resource.visibility !== "private" || resource.status !== "published") return 0;
  if (resource.allowedUserIds.length === 0) return 0;

  let announced = 0;

  for (const userId of resource.allowedUserIds.slice(0, 200)) {
    try {
      const profile = await getClientProfile(userId);
      const preferred = profile?.preferredLanguage ?? "";
      const locale: Locale = isLocale(preferred) ? preferred : defaultLocale;

      await notify({
        userId,
        type: "resource_available",
        title: resource.title,
        href: href("portalResources", locale, resource.slug),
      });

      const account = await findAccount(userId);
      if (account?.email) {
        await sendTransactionalEmail(
          account.email,
          resourceAvailableEmail(locale, {
            title: resource.title,
            url: publicUrl("portalResources", locale, resource.slug),
          }),
        );
      }

      announced += 1;
    } catch (error) {
      console.error("[ressources] annonce impossible :", error);
    }
  }

  return announced;
}
