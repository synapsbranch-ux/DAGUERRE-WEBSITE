import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/account/AuthShell";
import { ResetPasswordForm } from "@/components/account/PasswordForms";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/nouveau-mot-de-passe">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionaryFor(locale);
  return createMetadata({
    locale,
    routeKey: "resetPassword",
    title: dict.platform.auth.resetTitle,
    description: dict.platform.auth.resetLead,
    noIndex: true,
  });
}

export default async function ResetPasswordPage({
  params,
}: PageProps<"/[locale]/nouveau-mot-de-passe">) {
  const { locale } = await params;
  if (!isLocale(locale)) redirect("/");
  const dict = await getDictionaryFor(locale);

  return (
    <AuthShell
      eyebrow={dict.platform.portal.title}
      title={dict.platform.auth.resetTitle}
      lead={dict.platform.auth.resetLead}
    >
      {/* `useSearchParams` impose une frontière de suspense au prérendu. */}
      <Suspense fallback={<p className="text-sm text-muted-foreground">{dict.platform.common.loading}</p>}>
        <ResetPasswordForm dict={dict} signInHref={href("login", locale)} />
      </Suspense>
    </AuthShell>
  );
}
