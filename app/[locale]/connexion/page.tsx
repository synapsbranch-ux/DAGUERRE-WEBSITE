import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/account/AuthShell";
import { SignInForm } from "@/components/account/SignInForm";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { readPlatformSession, safeNextPath } from "@/lib/platform/access";
import { isAdminRole } from "@/lib/platform/enums";
import { href } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

/**
 * Connexion — page unique du site.
 *
 * Le tableau de bord et l'espace client partagent la même identité : deux
 * écrans de connexion, ce serait deux implémentations à sécuriser et deux
 * endroits où corriger la même faille.
 */
export async function generateMetadata({ params }: PageProps<"/[locale]/connexion">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionaryFor(locale);
  return createMetadata({
    locale,
    routeKey: "login",
    title: dict.platform.auth.signInTitle,
    description: dict.platform.auth.signInLead,
    noIndex: true,
  });
}

export default async function SignInPage({ params, searchParams }: PageProps<"/[locale]/connexion">) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect("/");

  const query = await searchParams;
  const dict = await getDictionaryFor(locale);
  const portalHref = href("portal", locale);
  const nextPath = safeNextPath(query.suivant, "");

  // Déjà connecté : inutile de redemander un mot de passe.
  const session = await readPlatformSession();
  if (session) redirect(nextPath || (isAdminRole(session.user.role) ? "/admin" : portalHref));

  return (
    <AuthShell
      eyebrow={dict.platform.portal.title}
      title={dict.platform.auth.signInTitle}
      lead={dict.platform.auth.signInLead}
    >
      <SignInForm
        dict={dict}
        forgotHref={href("forgotPassword", locale)}
        registerHref={href("register", locale)}
        fallbackHref={portalHref}
        nextPath={nextPath}
        initialError={query.error === "forbidden" ? dict.platform.auth.forbidden : undefined}
      />
    </AuthShell>
  );
}
