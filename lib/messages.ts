/** Cycle de vie d'un message de contact : nouveau → lu → répondu → archivé. */
export const messageStatuses = ["new", "read", "replied", "archived"] as const;

export type MessageStatus = (typeof messageStatuses)[number];

/** Libellés français, partagés par la liste et la fiche d'un message. */
export const messageStatusLabels: Record<MessageStatus, string> = {
  new: "Nouveau",
  read: "Lu",
  replied: "Répondu",
  archived: "Archivé",
};

/** Étape suivante proposée par défaut dans la fiche. */
export const nextMessageStatus: Record<MessageStatus, MessageStatus | null> = {
  new: "read",
  read: "replied",
  replied: "archived",
  archived: null,
};

export function isMessageStatus(value: unknown): value is MessageStatus {
  return typeof value === "string" && (messageStatuses as readonly string[]).includes(value);
}
