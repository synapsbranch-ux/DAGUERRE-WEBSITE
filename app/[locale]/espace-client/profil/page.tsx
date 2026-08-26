import { notFound } from "next/navigation";

import { PortalHeader } from "@/components/portal/PortalPage";
import { ProfileForm } from "@/components/portal/ProfileForm";
import { NewsletterSubscriberModel } from "@/lib/db/models/platform";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { requirePortal } from "@/lib/platform/portal";

export default async function PortalProfilePage({ params }: PageProps<"/[locale]/espace-client/profil">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);

  // L'abonnement se lit sur l'adresse du compte : c'est elle qui reçoit.
  const subscriber = (await NewsletterSubscriberModel.findOne({ email: portal.session.user.email })
    .select("status")
    .lean()) as { status?: string } | null;

  return (
    <div className="grid gap-10">
      <PortalHeader
        eyebrow={dict.platform.portal.title}
        title={dict.platform.profile.title}
        lead={dict.platform.profile.lead}
      />
      <ProfileForm
        dict={dict}
        profile={portal.profile}
        subscribed={subscriber?.status === "active" || subscriber?.status === "pending"}
      />
    </div>
  );
}
