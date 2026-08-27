import type { Locale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/platform/format";
import type { MessageEntry } from "@/lib/platform/queries";
import { formatBytes } from "@/lib/platform/format";
import { cn } from "@/lib/utils";

/**
 * Fil de discussion.
 *
 * Le corps d'un message est rendu comme du **texte** : React échappe le
 * contenu, et rien n'est passé à `dangerouslySetInnerHTML`. Un client qui
 * écrirait une balise la verrait s'afficher telle quelle — c'est exactement le
 * comportement voulu.
 *
 * `whitespace-pre-line` conserve les sauts de ligne saisis sans jamais
 * interpréter de balisage.
 */
export function MessageThread({
  messages,
  locale,
  emptyLabel,
  viewerRole,
}: {
  messages: MessageEntry[];
  locale: Locale;
  emptyLabel: string;
  /** Détermine de quel côté s'affichent « vos » messages. */
  viewerRole: "admin" | "customer";
}) {
  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ol className="grid gap-4">
      {messages.map((message) => {
        const mine = message.senderRole === viewerRole;
        return (
          <li
            key={message.id}
            className={cn("flex", mine ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg border p-4",
                mine ? "border-foreground/15 bg-foreground/5" : "border-border bg-[var(--plate)]",
              )}
            >
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {message.senderName || (message.senderRole === "admin" ? "Daguerre" : "")}
                </span>{" "}
                · {formatDateTime(message.createdAt, locale)}
              </p>

              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{message.body}</p>

              {message.attachments.length > 0 ? (
                <ul className="mt-3 grid gap-1.5">
                  {message.attachments.map((file) => (
                    <li key={file.id} className="text-xs">
                      <a
                        href={`/api/files/${file.id}`}
                        className="underline underline-offset-4"
                        rel="nofollow"
                      >
                        {file.filename}
                      </a>
                      <span className="ml-2 text-muted-foreground">{formatBytes(file.size, locale)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
