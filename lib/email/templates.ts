import { renderEmail, type EmailBlock, type EmailDocument } from "@/lib/email/layout";
import type { Locale } from "@/lib/i18n";

/**
 * Gabarits transactionnels.
 *
 * Un gabarit = un sujet + un document. Le HTML n'est jamais recopié d'un
 * gestionnaire à l'autre : chaque courriel du produit a ici son unique
 * définition, en français et en anglais.
 *
 * La langue employée est celle du destinataire — la locale d'un abonné, celle
 * d'une demande de devis — et non celle de l'administrateur qui déclenche
 * l'envoi.
 */

export type RenderedEmail = { subject: string; html: string; text: string };

type Copy = Record<Locale, string>;

function build(
  locale: Locale,
  subject: Copy,
  title: Copy,
  blocks: EmailBlock[],
  extra: Partial<Omit<EmailDocument, "locale" | "title" | "blocks">> = {},
): RenderedEmail {
  const rendered = renderEmail({ locale, title: title[locale], blocks, ...extra });
  return { subject: subject[locale], html: rendered.html, text: rendered.text };
}

const p = (fr: string, en: string, locale: Locale): EmailBlock => ({
  kind: "paragraph",
  text: locale === "fr" ? fr : en,
});

const cta = (fr: string, en: string, href: string, locale: Locale): EmailBlock => ({
  kind: "cta",
  label: locale === "fr" ? fr : en,
  href,
});

const IGNORE: Copy = {
  fr: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
  en: "If you did not make this request, you can safely ignore this message.",
};

/* ------------------------------------------------------------------ */
/* Compte                                                              */
/* ------------------------------------------------------------------ */

export function accountWelcomeEmail(
  locale: Locale,
  params: { name: string; portalUrl: string },
): RenderedEmail {
  return build(
    locale,
    { fr: "Bienvenue dans votre espace client", en: "Welcome to your client area" },
    { fr: "Votre compte est ouvert", en: "Your account is open" },
    [
      p(
        `Bonjour ${params.name}, votre espace client est prêt. Vous pouvez y suivre vos demandes de devis, échanger avec l'équipe et accéder aux ressources qui vous sont réservées.`,
        `Hello ${params.name}, your client area is ready. You can track your quote requests, exchange messages with the team and reach the resources reserved for you.`,
        locale,
      ),
      cta("Ouvrir mon espace", "Open my client area", params.portalUrl, locale),
    ],
  );
}

/* ------------------------------------------------------------------ */
/* Facturation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Transmission d'une facture.
 *
 * Le montant et l'échéance figurent dans le courriel, mais **le PDF fait foi**
 * et voyage en pièce jointe : un client doit pouvoir archiver sa facture sans
 * dépendre d'un lien qui vivra moins longtemps que son obligation comptable.
 */
export function invoiceIssuedEmail(
  locale: Locale,
  params: { invoiceNumber: string; total: string; dueDate: string; url: string },
): RenderedEmail {
  return build(
    locale,
    {
      fr: `Facture ${params.invoiceNumber}`,
      en: `Invoice ${params.invoiceNumber}`,
    },
    { fr: "Votre facture", en: "Your invoice" },
    [
      p(
        `Voici la facture ${params.invoiceNumber}, d'un montant de ${params.total}.`,
        `Here is invoice ${params.invoiceNumber}, for ${params.total}.`,
        locale,
      ),
      ...(params.dueDate
        ? [
            {
              kind: "definition" as const,
              rows: [{ term: locale === "fr" ? "Échéance" : "Due date", value: params.dueDate }],
            },
          ]
        : []),
      p(
        "Le document complet est joint à ce message et reste consultable depuis votre espace client.",
        "The full document is attached to this message and remains available in your client area.",
        locale,
      ),
      cta("Ouvrir mon espace", "Open my client area", params.url, locale),
    ],
  );
}

/* ------------------------------------------------------------------ */
/* Contrats                                                            */
/* ------------------------------------------------------------------ */

/**
 * Invitation à signer.
 *
 * Le lien **est** l'autorisation : il n'est envoyé qu'à l'adresse du signataire
 * et n'est jamais repris ailleurs. Le document n'est pas joint — il se consulte
 * derrière le lien, où la lecture est tracée pour la piste d'audit.
 */
export function contractToSignEmail(
  locale: Locale,
  params: { title: string; contractNumber: string; senderName: string; message: string; url: string },
): RenderedEmail {
  return build(
    locale,
    {
      fr: `À signer : ${params.title}`,
      en: `To sign: ${params.title}`,
    },
    { fr: "Un document attend votre signature", en: "A document awaits your signature" },
    [
      p(
        `${params.senderName} vous invite à signer « ${params.title} » (${params.contractNumber}).`,
        `${params.senderName} invites you to sign "${params.title}" (${params.contractNumber}).`,
        locale,
      ),
      ...(params.message ? [{ kind: "quote" as const, text: params.message }] : []),
      cta("Lire et signer", "Read and sign", params.url, locale),
      p(
        "Ce lien vous est personnel : ne le transmettez pas. Il expire dans trente jours.",
        "This link is personal to you: do not forward it. It expires in thirty days.",
        locale,
      ),
    ],
  );
}

/** Le contrat est signé par toutes les parties — le document scellé est joint. */
export function contractSignedEmail(
  locale: Locale,
  params: { title: string; contractNumber: string; url: string },
): RenderedEmail {
  return build(
    locale,
    {
      fr: `Signé : ${params.title}`,
      en: `Signed: ${params.title}`,
    },
    { fr: "Document signé par toutes les parties", en: "Document signed by all parties" },
    [
      p(
        `« ${params.title} » (${params.contractNumber}) est signé par toutes les parties. La version définitive, accompagnée de sa piste d'audit, est jointe à ce message.`,
        `"${params.title}" (${params.contractNumber}) has been signed by all parties. The final version, with its audit trail, is attached to this message.`,
        locale,
      ),
      cta("Ouvrir mon espace", "Open my client area", params.url, locale),
    ],
  );
}

/* ------------------------------------------------------------------ */
/* Infolettre                                                          */
/* ------------------------------------------------------------------ */

export function newsletterConfirmEmail(
  locale: Locale,
  params: { confirmUrl: string },
): RenderedEmail {
  return build(
    locale,
    { fr: "Confirmez votre inscription à l'infolettre", en: "Confirm your newsletter subscription" },
    { fr: "Une dernière étape", en: "One last step" },
    [
      p(
        "Confirmez votre adresse pour recevoir l'infolettre. Sans cette confirmation, aucune infolettre ne vous sera envoyée.",
        "Confirm your address to receive the newsletter. Without this confirmation, no newsletter will be sent to you.",
        locale,
      ),
      cta("Confirmer mon inscription", "Confirm my subscription", params.confirmUrl, locale),
      { kind: "paragraph", text: IGNORE[locale] },
    ],
  );
}

export function newsletterWelcomeEmail(
  locale: Locale,
  params: { unsubscribeUrl: string; blogUrl: string },
): RenderedEmail {
  return build(
    locale,
    { fr: "Votre inscription est confirmée", en: "Your subscription is confirmed" },
    { fr: "Inscription confirmée", en: "Subscription confirmed" },
    [
      p(
        "Merci. Vous recevrez désormais les analyses, les publications et les ressources au fil de leur parution.",
        "Thank you. You will now receive analyses, publications and resources as they are released.",
        locale,
      ),
      cta("Lire les derniers articles", "Read the latest articles", params.blogUrl, locale),
    ],
    { unsubscribeUrl: params.unsubscribeUrl },
  );
}

/* ------------------------------------------------------------------ */
/* Devis                                                               */
/* ------------------------------------------------------------------ */

export function quoteReceivedClientEmail(
  locale: Locale,
  params: { quoteNumber: string; title: string; actionUrl: string; hasAccount: boolean },
): RenderedEmail {
  return build(
    locale,
    {
      fr: `Demande reçue — ${params.quoteNumber}`,
      en: `Request received — ${params.quoteNumber}`,
    },
    { fr: "Votre demande est bien arrivée", en: "Your request has arrived" },
    [
      p(
        "Merci pour votre demande. Elle est enregistrée et sera étudiée sous peu. Conservez la référence ci-dessous : elle identifie votre dossier dans tous nos échanges.",
        "Thank you for your request. It has been recorded and will be reviewed shortly. Keep the reference below: it identifies your file in all our exchanges.",
        locale,
      ),
      {
        kind: "definition",
        rows: [
          { term: locale === "fr" ? "Référence" : "Reference", value: params.quoteNumber },
          { term: locale === "fr" ? "Projet" : "Project", value: params.title },
        ],
      },
      params.hasAccount
        ? cta("Suivre ma demande", "Track my request", params.actionUrl, locale)
        : cta("Créer mon compte de suivi", "Create my tracking account", params.actionUrl, locale),
      params.hasAccount
        ? p(
            "Vous retrouverez à tout moment l'état de votre demande dans votre espace client.",
            "You can check the status of your request at any time in your client area.",
            locale,
          )
        : p(
            "Ce lien vous permet d'ouvrir un compte rattaché à cette demande, pour en suivre l'avancement et échanger avec l'équipe.",
            "This link lets you open an account attached to this request, to follow its progress and exchange messages with the team.",
            locale,
          ),
    ],
  );
}

export function quoteReceivedAdminEmail(
  locale: Locale,
  params: {
    quoteNumber: string;
    title: string;
    clientName: string;
    clientEmail: string;
    company: string;
    adminUrl: string;
  },
): RenderedEmail {
  return build(
    locale,
    { fr: `Nouvelle demande — ${params.quoteNumber}`, en: `New request — ${params.quoteNumber}` },
    { fr: "Nouvelle demande de devis", en: "New quote request" },
    [
      {
        kind: "definition",
        rows: [
          { term: locale === "fr" ? "Référence" : "Reference", value: params.quoteNumber },
          { term: locale === "fr" ? "Projet" : "Project", value: params.title },
          { term: locale === "fr" ? "Client" : "Client", value: params.clientName },
          { term: locale === "fr" ? "Courriel" : "Email", value: params.clientEmail },
          ...(params.company
            ? [{ term: locale === "fr" ? "Organisation" : "Organisation", value: params.company }]
            : []),
        ],
      },
      cta("Ouvrir le dossier", "Open the file", params.adminUrl, locale),
    ],
  );
}

export function quoteStatusEmail(
  locale: Locale,
  params: { quoteNumber: string; statusLabel: string; url: string },
): RenderedEmail {
  return build(
    locale,
    {
      fr: `Votre demande ${params.quoteNumber} a évolué`,
      en: `Your request ${params.quoteNumber} has moved forward`,
    },
    { fr: "Mise à jour de votre demande", en: "Update on your request" },
    [
      {
        kind: "definition",
        rows: [
          { term: locale === "fr" ? "Référence" : "Reference", value: params.quoteNumber },
          { term: locale === "fr" ? "Nouvel état" : "New status", value: params.statusLabel },
        ],
      },
      cta("Voir le détail", "View the details", params.url, locale),
    ],
  );
}

export function informationRequestedEmail(
  locale: Locale,
  params: { quoteNumber: string; url: string },
): RenderedEmail {
  return build(
    locale,
    {
      fr: `Information requise — ${params.quoteNumber}`,
      en: `Information required — ${params.quoteNumber}`,
    },
    { fr: "Nous avons besoin d'une précision", en: "We need one clarification" },
    [
      p(
        `Pour préparer votre estimation, une précision est nécessaire sur la demande ${params.quoteNumber}. Le détail vous attend dans votre espace client.`,
        `To prepare your estimate, we need a clarification on request ${params.quoteNumber}. The details are waiting in your client area.`,
        locale,
      ),
      cta("Répondre", "Reply", params.url, locale),
    ],
  );
}

export function proposalSentEmail(
  locale: Locale,
  params: {
    quoteNumber: string;
    proposalTitle: string;
    total: string;
    validUntil: string;
    url: string;
  },
): RenderedEmail {
  return build(
    locale,
    { fr: `Votre devis ${params.quoteNumber}`, en: `Your quote ${params.quoteNumber}` },
    { fr: "Votre devis est prêt", en: "Your quote is ready" },
    [
      p(
        "Voici la proposition correspondant à votre demande. Vous pouvez l'examiner, poser vos questions, puis l'accepter ou la refuser depuis votre espace client.",
        "Here is the proposal matching your request. You can review it, ask questions, then accept or decline it from your client area.",
        locale,
      ),
      {
        kind: "definition",
        rows: [
          { term: locale === "fr" ? "Référence" : "Reference", value: params.quoteNumber },
          { term: locale === "fr" ? "Proposition" : "Proposal", value: params.proposalTitle },
          { term: locale === "fr" ? "Total" : "Total", value: params.total },
          ...(params.validUntil
            ? [{ term: locale === "fr" ? "Valable jusqu'au" : "Valid until", value: params.validUntil }]
            : []),
        ],
      },
      cta("Consulter le devis", "View the quote", params.url, locale),
    ],
  );
}

export function proposalDecisionAdminEmail(
  locale: Locale,
  params: { quoteNumber: string; accepted: boolean; clientName: string; url: string },
): RenderedEmail {
  return build(
    locale,
    params.accepted
      ? { fr: `Devis accepté — ${params.quoteNumber}`, en: `Quote accepted — ${params.quoteNumber}` }
      : { fr: `Devis refusé — ${params.quoteNumber}`, en: `Quote declined — ${params.quoteNumber}` },
    params.accepted
      ? { fr: "Le client a accepté", en: "The client accepted" }
      : { fr: "Le client a refusé", en: "The client declined" },
    [
      {
        kind: "definition",
        rows: [
          { term: locale === "fr" ? "Référence" : "Reference", value: params.quoteNumber },
          { term: locale === "fr" ? "Client" : "Client", value: params.clientName },
        ],
      },
      cta("Ouvrir le dossier", "Open the file", params.url, locale),
    ],
  );
}

/* ------------------------------------------------------------------ */
/* Messagerie                                                          */
/* ------------------------------------------------------------------ */

/**
 * Notification de message.
 *
 * Le corps du message n'est **pas** repris : un courriel transite en clair par
 * plusieurs serveurs et s'affiche en aperçu sur un écran verrouillé. On ne
 * transporte que l'objet et le lien vers la conversation.
 */
export function newMessageEmail(
  locale: Locale,
  params: { subject: string; reference: string; url: string; forAdmin: boolean; senderName: string },
): RenderedEmail {
  return build(
    locale,
    params.forAdmin
      ? { fr: `Nouveau message de ${params.senderName}`, en: `New message from ${params.senderName}` }
      : { fr: "Vous avez un nouveau message", en: "You have a new message" },
    { fr: "Nouveau message", en: "New message" },
    [
      p(
        params.reference
          ? `Un nouveau message vous attend concernant ${params.reference}.`
          : "Un nouveau message vous attend.",
        params.reference
          ? `A new message is waiting for you regarding ${params.reference}.`
          : "A new message is waiting for you.",
        locale,
      ),
      ...(params.subject
        ? [
            {
              kind: "definition" as const,
              rows: [{ term: locale === "fr" ? "Objet" : "Subject", value: params.subject }],
            },
          ]
        : []),
      cta("Lire le message", "Read the message", params.url, locale),
    ],
  );
}

/* ------------------------------------------------------------------ */
/* Projets et ressources                                               */
/* ------------------------------------------------------------------ */

export function projectOpenedEmail(
  locale: Locale,
  params: { projectNumber: string; title: string; url: string },
): RenderedEmail {
  return build(
    locale,
    { fr: `Votre projet ${params.projectNumber}`, en: `Your project ${params.projectNumber}` },
    { fr: "Votre projet est ouvert", en: "Your project is open" },
    [
      p(
        "Le devis accepté est devenu un projet. Vous y retrouverez son avancement, ses documents et les échanges qui s'y rapportent.",
        "The accepted quote has become a project. You will find its progress, its documents and the related exchanges there.",
        locale,
      ),
      {
        kind: "definition",
        rows: [
          { term: locale === "fr" ? "Référence" : "Reference", value: params.projectNumber },
          { term: locale === "fr" ? "Projet" : "Project", value: params.title },
        ],
      },
      cta("Ouvrir le projet", "Open the project", params.url, locale),
    ],
  );
}

export function projectUpdateEmail(
  locale: Locale,
  params: { projectNumber: string; updateTitle: string; url: string },
): RenderedEmail {
  return build(
    locale,
    {
      fr: `Mise à jour — ${params.projectNumber}`,
      en: `Update — ${params.projectNumber}`,
    },
    { fr: "Avancement de votre projet", en: "Progress on your project" },
    [
      {
        kind: "definition",
        rows: [
          { term: locale === "fr" ? "Référence" : "Reference", value: params.projectNumber },
          { term: locale === "fr" ? "Mise à jour" : "Update", value: params.updateTitle },
        ],
      },
      cta("Voir l'avancement", "See the progress", params.url, locale),
    ],
  );
}

export function resourceAvailableEmail(
  locale: Locale,
  params: { title: string; url: string },
): RenderedEmail {
  return build(
    locale,
    { fr: "Une ressource vous attend", en: "A resource is waiting for you" },
    { fr: "Nouvelle ressource disponible", en: "New resource available" },
    [
      {
        kind: "definition",
        rows: [{ term: locale === "fr" ? "Ressource" : "Resource", value: params.title }],
      },
      cta("Consulter la ressource", "View the resource", params.url, locale),
    ],
  );
}

/* ------------------------------------------------------------------ */
/* Rendez-vous                                                         */
/* ------------------------------------------------------------------ */

/**
 * Confirmation d'un rendez-vous — l'invitation d'agenda voyage en pièce jointe.
 *
 * L'heure est **déjà formatée** par l'appelant, dans le fuseau annoncé par le
 * réservant. La reformater ici obligerait le gabarit à connaître les fuseaux, et
 * un courriel qui annonce une heure dans le mauvais fuseau vaut moins que pas de
 * courriel du tout.
 */
export function bookingConfirmedEmail(
  locale: Locale,
  params: {
    typeName: string;
    when: string;
    timezone: string;
    durationMinutes: number;
    location: string;
    manageUrl: string;
  },
): RenderedEmail {
  return build(
    locale,
    { fr: `Rendez-vous confirmé : ${params.when}`, en: `Meeting confirmed: ${params.when}` },
    { fr: "Votre rendez-vous est confirmé", en: "Your meeting is confirmed" },
    [
      {
        kind: "definition",
        rows: [
          { term: locale === "fr" ? "Rencontre" : "Meeting", value: params.typeName },
          { term: locale === "fr" ? "Date" : "Date", value: `${params.when} (${params.timezone})` },
          {
            term: locale === "fr" ? "Durée" : "Duration",
            value: `${params.durationMinutes} min`,
          },
          { term: locale === "fr" ? "Lieu" : "Location", value: params.location },
        ],
      },
      p(
        "L'invitation jointe s'ajoute à votre agenda en un clic.",
        "The attached invitation adds the meeting to your calendar in one click.",
        locale,
      ),
      cta("Gérer ou annuler", "Manage or cancel", params.manageUrl, locale),
    ],
  );
}

/** Annulation d'un rendez-vous, quelle qu'en soit l'origine. */
export function bookingCancelledEmail(
  locale: Locale,
  params: { typeName: string; when: string; reason: string; bookingUrl: string },
): RenderedEmail {
  return build(
    locale,
    { fr: `Rendez-vous annulé : ${params.when}`, en: `Meeting cancelled: ${params.when}` },
    { fr: "Votre rendez-vous est annulé", en: "Your meeting is cancelled" },
    [
      p(
        `Le rendez-vous « ${params.typeName} » du ${params.when} est annulé.`,
        `The "${params.typeName}" meeting on ${params.when} has been cancelled.`,
        locale,
      ),
      ...(params.reason ? [{ kind: "quote" as const, text: params.reason }] : []),
      cta("Choisir un autre créneau", "Pick another time", params.bookingUrl, locale),
    ],
  );
}

/**
 * Avis interne d'une nouvelle réservation.
 *
 * Il part vers l'adresse de l'entreprise, pas vers le réservant : l'heure y est
 * donc exprimée dans le **fuseau de référence**, celui dans lequel l'agenda est
 * tenu, et non dans celui du visiteur.
 */
export function bookingNoticeEmail(
  locale: Locale,
  params: {
    typeName: string;
    when: string;
    name: string;
    email: string;
    phone: string;
    note: string;
    adminUrl: string;
  },
): RenderedEmail {
  return build(
    locale,
    { fr: `Nouveau rendez-vous : ${params.when}`, en: `New meeting: ${params.when}` },
    { fr: "Un rendez-vous vient d'être réservé", en: "A meeting has just been booked" },
    [
      {
        kind: "definition",
        rows: [
          { term: locale === "fr" ? "Rencontre" : "Meeting", value: params.typeName },
          { term: locale === "fr" ? "Date" : "Date", value: params.when },
          { term: locale === "fr" ? "Personne" : "Person", value: params.name },
          { term: locale === "fr" ? "Courriel" : "Email", value: params.email },
          ...(params.phone
            ? [{ term: locale === "fr" ? "Téléphone" : "Phone", value: params.phone }]
            : []),
        ],
      },
      ...(params.note ? [{ kind: "quote" as const, text: params.note }] : []),
      cta("Ouvrir l'agenda", "Open the calendar", params.adminUrl, locale),
    ],
  );
}
