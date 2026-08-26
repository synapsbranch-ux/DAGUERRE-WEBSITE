import { absoluteLink } from "@/lib/email/layout";
import {
  deliver,
  marketingFrom,
  replyToAddress,
  transactionalFrom,
  type DeliveryResult,
} from "@/lib/email/provider";
import type { RenderedEmail } from "@/lib/email/templates";
import type { Locale } from "@/lib/i18n";
import { href, type RouteKey } from "@/lib/routes";

/**
 * Deux canaux, volontairement séparés.
 *
 * - **Transactionnel** : confirmation de devis, réinitialisation de mot de
 *   passe, notification de message. Ces courriels sont attendus, ils font
 *   partie du service, et un désabonnement à l'infolettre ne doit jamais les
 *   couper.
 * - **Marketing** : l'infolettre. Elle exige un consentement explicite, porte
 *   un lien de désabonnement fonctionnel et les en-têtes `List-Unsubscribe`
 *   que les messageries utilisent pour offrir un désabonnement en un clic.
 *
 * Mélanger les deux, c'est soit priver un client d'une information dont il a
 * besoin, soit lui imposer une communication commerciale qu'il a refusée.
 */

export type SendOutcome = DeliveryResult;

/** Courriel de service, envoyé depuis l'adresse transactionnelle. */
export function sendTransactionalEmail(to: string, email: RenderedEmail): Promise<SendOutcome> {
  return deliver(
    { to, subject: email.subject, html: email.html, text: email.text, replyTo: replyToAddress() },
    transactionalFrom(),
  );
}

/**
 * Courriel d'infolettre.
 *
 * `List-Unsubscribe` et `List-Unsubscribe-Post` déclarent le désabonnement en
 * un clic : sans eux, un destinataire agacé n'a que le bouton « courrier
 * indésirable », qui abîme durablement la délivrabilité du domaine.
 */
export function sendNewsletterEmail(
  to: string,
  email: RenderedEmail,
  unsubscribeUrl: string,
): Promise<SendOutcome> {
  return deliver(
    {
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    },
    marketingFrom(),
  );
}

/**
 * Adresse recevant les alertes d'exploitation (nouvelle demande, décision
 * client). Sans `ADMIN_NOTIFICATION_EMAIL`, aucune alerte n'est tentée —
 * mieux vaut pas d'alerte qu'une alerte envoyée à une adresse inventée.
 */
export function adminNotificationAddress(): string | null {
  const value = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
  return value || null;
}

/** URL publique absolue d'une route, dans la langue du destinataire. */
export function publicUrl(key: RouteKey, locale: Locale, ...segments: string[]): string {
  return absoluteLink(href(key, locale, ...segments));
}

/** URL absolue d'un chemin du tableau de bord. */
export function adminUrl(path: string): string {
  return absoluteLink(path.startsWith("/admin") ? path : `/admin${path}`);
}
