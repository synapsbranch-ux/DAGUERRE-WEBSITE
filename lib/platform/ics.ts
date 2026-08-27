import { createEvents, type DateArray, type EventAttributes } from "ics";

/**
 * Production de fichiers iCalendar.
 *
 * ## Pourquoi une pièce jointe et non un lien
 *
 * Un rendez-vous confirmé doit atterrir dans l'agenda du réservant, qui n'a pas
 * de compte ici et n'aura pas envie d'en créer un. Le format `.ics` est le seul
 * que tous les agendas savent lire : Apple, Google, Outlook, Thunderbird.
 *
 * ## Les instants partent en UTC
 *
 * `startInputType: "utc"` évite le piège du fuseau : l'événement porte un
 * instant absolu, que chaque agenda affiche ensuite à l'heure de son
 * propriétaire. Écrire une heure locale sans déclarer sa VTIMEZONE produirait
 * un rendez-vous décalé chez la moitié des destinataires.
 *
 * ## L'UID est stable
 *
 * Un même rendez-vous réémis — confirmation, puis annulation — doit porter le
 * **même** UID, sinon l'agenda du destinataire garde deux entrées dont l'une
 * fantôme. L'identifiant de la réservation fait donc l'UID, et `sequence`
 * s'incrémente à chaque mise à jour.
 */

export type CalendarEntry = {
  id: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  url?: string;
  organizer?: { name: string; email: string };
  attendees?: { name: string; email: string }[];
  cancelled?: boolean;
  sequence?: number;
};

/**
 * Domaine des UID.
 *
 * Un UID iCalendar se termine par un domaine, par convention. Sa seule
 * exigence est d'être stable et unique : il n'est jamais affiché, et rien ne le
 * résout — d'où une constante plutôt qu'un réglage.
 */
const UID_DOMAIN = "daguerre";

/** Nom affiché par défaut, si l'appelant n'a pas de nom de marque à passer. */
const DEFAULT_CALENDAR_NAME = "Agenda";

function toArray(date: Date): DateArray {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ];
}

function toEvent(entry: CalendarEntry, method: "REQUEST" | "CANCEL" | "PUBLISH"): EventAttributes {
  return {
    uid: `${entry.id}@${UID_DOMAIN}`,
    title: entry.title,
    description: entry.description || undefined,
    location: entry.location || undefined,
    url: entry.url || undefined,
    start: toArray(entry.start),
    startInputType: "utc",
    startOutputType: "utc",
    end: toArray(entry.end),
    endInputType: "utc",
    endOutputType: "utc",
    status: entry.cancelled ? "CANCELLED" : "CONFIRMED",
    busyStatus: entry.cancelled ? "FREE" : "BUSY",
    sequence: entry.sequence ?? 0,
    method,
    organizer: entry.organizer,
    attendees: entry.attendees?.map((attendee) => ({
      name: attendee.name,
      email: attendee.email,
      rsvp: true,
      partstat: "NEEDS-ACTION",
      role: "REQ-PARTICIPANT",
    })),
  };
}

/**
 * Rend un ou plusieurs événements au format iCalendar.
 *
 * Renvoie `null` plutôt que de lever : un agenda qui ne se génère pas ne doit
 * jamais empêcher une confirmation de partir. Le rendez-vous existe en base ;
 * la pièce jointe est un confort.
 */
export function renderCalendar(
  entries: CalendarEntry[],
  method: "REQUEST" | "CANCEL" | "PUBLISH" = "REQUEST",
  /** Nom affiché par l'agenda du destinataire — le nom de marque, en pratique. */
  calendarName?: string,
): string | null {
  if (entries.length === 0) return null;

  const { error, value } = createEvents(
    entries.map((entry) => toEvent(entry, method)),
    {
      productId: "daguerre/ics",
      method,
      calName: calendarName?.trim() || DEFAULT_CALENDAR_NAME,
    },
  );

  if (error || !value) {
    console.error("[agenda] fichier iCalendar non produit :", error);
    return null;
  }

  return value;
}

/** Pièce jointe prête pour un courriel transactionnel. */
export function calendarAttachment(
  entries: CalendarEntry[],
  method: "REQUEST" | "CANCEL" = "REQUEST",
  calendarName?: string,
): { filename: string; content: Buffer; contentType: string }[] | undefined {
  const value = renderCalendar(entries, method, calendarName);
  if (!value) return undefined;

  return [
    {
      filename: "rendez-vous.ics",
      content: Buffer.from(value, "utf8"),
      // `method=` dans le type MIME est ce qui fait qu'Outlook propose
      // « Accepter » plutôt qu'une pièce jointe inerte.
      contentType: `text/calendar; charset=utf-8; method=${method}`,
    },
  ];
}
