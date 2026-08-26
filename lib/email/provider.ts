/**
 * Transport de courriel.
 *
 * ## Pourquoi une abstraction
 *
 * Le site n'avait aucun envoi sortant. Plutôt que de coller un SDK à chaque
 * point d'appel, tout passe par `deliver()` : les gabarits, la file d'envoi
 * des campagnes et les notifications transactionnelles ne connaissent qu'une
 * signature.
 *
 * ## Fournisseur
 *
 * Resend est retenu et appelé par son API HTTP, sans dépendance
 * supplémentaire : `fetch` suffit, et le paquet npm n'apporterait ici qu'une
 * enveloppe autour du même appel.
 *
 * ## Absence de configuration
 *
 * Sans `RESEND_API_KEY`, l'envoi **échoue explicitement** en production ; en
 * développement il est journalisé en console. Aucun chemin ne renvoie « envoyé »
 * pour un courriel qui n'est jamais parti : une campagne marquée envoyée alors
 * que personne ne l'a reçue est pire que l'erreur elle-même.
 */

export type EmailAddress = string;

export type OutgoingEmail = {
  to: EmailAddress;
  subject: string;
  html: string;
  text: string;
  /** En-têtes additionnels — `List-Unsubscribe` pour le marketing. */
  headers?: Record<string, string>;
  replyTo?: string;
};

export type DeliveryResult =
  | { ok: true; id: string; transport: TransportName }
  | { ok: false; error: string; transport: TransportName };

export type TransportName = "resend" | "console" | "none";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Expéditeur transactionnel : confirmations, devis, messages. */
export function transactionalFrom(): string {
  return process.env.MAIL_FROM?.trim() || "Daguerre <onboarding@resend.dev>";
}

/**
 * Expéditeur marketing.
 *
 * Séparer les deux adresses protège les courriels essentiels : si un
 * destinataire signale une infolettre comme indésirable, la réputation
 * atteinte est celle du sous-domaine marketing, pas celle qui porte les
 * confirmations de devis.
 */
export function marketingFrom(): string {
  return process.env.MAIL_FROM_MARKETING?.trim() || transactionalFrom();
}

export function replyToAddress(): string | undefined {
  return process.env.MAIL_REPLY_TO?.trim() || undefined;
}

export function activeTransport(): TransportName {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.NODE_ENV !== "production") return "console";
  return "none";
}

/** Le courriel sortant est-il réellement configuré ? Affiché dans le CMS. */
export function isEmailConfigured(): boolean {
  return activeTransport() === "resend";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailAddress(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL_PATTERN.test(value.trim());
}

/**
 * Remise d'un courriel.
 *
 * N'émet jamais d'exception : l'appelant décide quoi faire d'un échec (marquer
 * un destinataire en erreur, prévenir l'administrateur, réessayer plus tard).
 */
export async function deliver(email: OutgoingEmail, from: string): Promise<DeliveryResult> {
  const transport = activeTransport();

  if (!isEmailAddress(email.to)) {
    return { ok: false, error: "Adresse destinataire invalide.", transport };
  }

  if (transport === "none") {
    return {
      ok: false,
      error: "Envoi de courriel non configuré : renseignez RESEND_API_KEY.",
      transport,
    };
  }

  if (transport === "console") {
    // Le corps n'est pas journalisé : un courriel transactionnel contient le
    // nom du client, parfois un lien à usage unique.
    console.info(`[email] (console) → ${email.to} — ${email.subject}`);
    return { ok: true, id: `console-${Date.now()}`, transport };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email.to.trim()],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        ...(email.headers ? { headers: email.headers } : {}),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (!response.ok) {
      return {
        ok: false,
        error: payload?.message || `Le fournisseur a répondu ${response.status}.`,
        transport,
      };
    }

    return { ok: true, id: String(payload?.id ?? ""), transport };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Fournisseur de courriel injoignable.",
      transport,
    };
  }
}
