import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/account/AuthShell";
import { isLogtoConfigured } from "@/lib/auth/logto";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { readPlatformSession, safeNextPath } from "@/lib/platform/access";
import { landingHref } from "@/lib/platform/landing";
import { createMetadata } from "@/lib/seo";

/**
 * Création de compte — tremplin vers Logto.
 *
 * Même rôle que la page de connexion, à un paramètre près : `ecran=inscription`
 * demande à Logto d'ouvrir directement le formulaire de création plutôt que
 * celui de connexion, pour que le visiteur ne cherche pas le lien.
 */
export async function generateMetadata({ params }: PageProps<"/[locale]/inscription">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionaryFor(locale);
  return createMetadata({
    locale,
    routeKey: "register",
    title: dict.platform.auth.signUpTitle,
    description: dict.platform.auth.signUpLead,
    noIndex: true,
  });
}

export default async function SignUpPage({ params, searchParams }: PageProps<"/[locale]/inscription">) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect("/");

  const query = await searchParams;
  const nextPath = safeNextPath(query.suivant, "");

  if (!isLogtoConfigured()) {
    const dict = await getDictionaryFor(locale);
    return (
      <AuthShell
        eyebrow={dict.platform.portal.title}
        title={dict.platform.auth.signUpTitle}
        lead={dict.platform.auth.unavailable}
      >
        <span />
      </AuthShell>
    );
  }

  const session = await readPlatformSession();
  if (session) redirect(nextPath || (await landingHref(session.user, null)));

  const target = new URLSearchParams({ langue: locale, ecran: "inscription" });
  if (nextPath) target.set("suivant", nextPath);
  redirect(`/api/auth/sign-in?${target.toString()}`);
}
