import { notFound } from "next/navigation";

import { NotificationList } from "@/components/portal/NotificationList";
import { PortalEmpty, PortalHeader } from "@/components/portal/PortalPage";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { requirePortal } from "@/lib/platform/portal";
import { listNotifications } from "@/lib/platform/queries";

export default async function PortalNotificationsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/espace-client/notifications">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, portal, query] = await Promise.all([
    getDictionaryFor(locale),
    requirePortal(locale),
    searchParams,
  ]);

  const unreadOnly = query.filtre === "non-lues";
  const notifications = await listNotifications(portal.session.user.id, { unreadOnly, limit: 100 });
  const t = dict.platform.notifications;

  return (
    <div className="grid gap-8">
      <PortalHeader eyebrow={dict.platform.portal.title} title={t.title} lead={t.lead} />

      {notifications.length === 0 ? (
        <PortalEmpty title={t.emptyTitle} description={t.emptyBody} />
      ) : (
        <NotificationList dict={dict} locale={locale} notifications={notifications} />
      )}
    </div>
  );
}
