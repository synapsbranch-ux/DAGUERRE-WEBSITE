import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/account/AuthShell";
import { SignUpForm } from "@/components/account/SignUpForm";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { readPlatformSession, safeNextPath } from "@/lib/platform/access";
import { href } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

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
  const dict = await getDictionaryFor(locale);
  const portalHref = href("portal", locale);
  const nextPath = safeNextPath(query.suivant, "");

  const session = await readPlatformSession();
  if (session) redirect(nextPath || portalHref);

  return (
    <AuthShell
      eyebrow={dict.platform.portal.title}
      title={dict.platform.auth.signUpTitle}
      lead={dict.platform.auth.signUpLead}
    >
      <SignUpForm
        dict={dict}
        locale={locale}
        signInHref={href("login", locale)}
        fallbackHref={portalHref}
        nextPath={nextPath}
      />
    </AuthShell>
  );
}
