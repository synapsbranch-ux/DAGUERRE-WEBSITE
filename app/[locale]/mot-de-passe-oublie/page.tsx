import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/account/AuthShell";
import { ForgotPasswordForm } from "@/components/account/PasswordForms";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/mot-de-passe-oublie">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionaryFor(locale);
  return createMetadata({
    locale,
    routeKey: "forgotPassword",
    title: dict.platform.auth.forgotTitle,
    description: dict.platform.auth.forgotLead,
    noIndex: true,
  });
}

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[locale]/mot-de-passe-oublie">) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect("/");
  const dict = await getDictionaryFor(locale);

  return (
    <AuthShell
      eyebrow={dict.platform.portal.title}
      title={dict.platform.auth.forgotTitle}
      lead={dict.platform.auth.forgotLead}
    >
      <ForgotPasswordForm
        dict={dict}
        redirectTo={absoluteUrl(href("resetPassword", locale))}
        signInHref={href("login", locale)}
      />
    </AuthShell>
  );
}
