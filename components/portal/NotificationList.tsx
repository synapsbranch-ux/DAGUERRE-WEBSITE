"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { labelOf, notificationTypeLabels } from "@/lib/platform/enums";
import { formatDateTime } from "@/lib/platform/format";
import type { NotificationEntry } from "@/lib/platform/queries";
import { cn } from "@/lib/utils";

/**
 * Centre de notifications.
 *
 * Les notifications sont **rendues côté serveur** ; ce composant n'ajoute que
 * le marquage comme lu. Le serveur porte toujours `userId` dans sa requête de
 * mise à jour : « tout marquer comme lu » ne peut toucher que la boîte du
 * compte connecté, quel que soit le corps envoyé.
 */
export function NotificationList({
  dict,
  locale,
  notifications,
}: {
  dict: Dictionary;
  locale: Locale;
  notifications: NotificationEntry[];
}) {
  const t = dict.platform.notifications;
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const unread = notifications.filter((notification) => !notification.readAt).length;

  async function mark(payload: { id?: string; all?: boolean }) {
    setBusy(true);
    await fetch("/api/client/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      {unread > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {unread} {t.unread.toLowerCase()}
          </p>
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => mark({ all: true })}>
            {t.markAllRead}
          </Button>
        </div>
      ) : null}

      <ul className="grid gap-3">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={cn(
              "rounded-lg border p-4",
              notification.readAt ? "border-border" : "border-foreground/25 bg-foreground/5",
            )}
          >
            <p className="text-xs text-muted-foreground">
              {labelOf(notificationTypeLabels, notification.type, locale)} ·{" "}
              {formatDateTime(notification.createdAt, locale)}
            </p>

            <p className="mt-1.5 font-medium">{notification.title}</p>
            {notification.message ? (
              <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {notification.href ? (
                <Link href={notification.href} className="text-sm underline underline-offset-4">
                  {dict.platform.common.open}
                </Link>
              ) : null}
              {notification.readAt ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => mark({ id: notification.id })}
                >
                  {t.markRead}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
