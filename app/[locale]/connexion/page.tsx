import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthShell, AuthFooterLink } from "@/components/account/AuthShell";
import { Button } from "@/components/ui/button";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { readPlatformSession, safeNextPath } from "@/lib/platform/access";
import { landingHref } from "@/lib/platform/landing";
import { href } from "@/lib/routes";
import { createMetadata } from "@/lib/seo";

/**
 * Connexion — tremplin vers Logto.
 *
 * L'écran de saisie appartient au fournisseur d'identité : aucun mot de passe
 * n'est jamais tapé sur ce domaine, donc aucun n'y transite ni n'y est stocké.
 * Cette page ne fait que deux choses — renvoyer un visiteur déjà connecté là
 * où il allait, et rediriger les autres vers Logto en conservant leur
 * destination.
 *
 * Elle reste une vraie page, avec ses URL bilingues (`/fr/connexion`,
 * `/en/login`) : tous les liens du site y mènent, et le fil d'Ariane en dépend.
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
  const nextPath = safeNextPath(query.suivant, "");
  const session = await readPlatformSession();

  /*
   * Compte connecté mais sans les droits demandés. Le renvoyer vers Logto ne
   * changerait rien à son rôle : il reviendrait ici, et la boucle tournerait
   * indéfiniment. On lui dit ce qui se passe, et on lui propose la porte qui
   * lui est ouverte.
   */
  if (session && query.error === "forbidden") {
    const dict = await getDictionaryFor(locale);
    return (
      <AuthShell
        eyebrow={dict.platform.portal.title}
        title={dict.platform.auth.forbiddenTitle}
        lead={dict.platform.auth.forbidden}
        footer={
          <AuthFooterLink
            label={dict.platform.auth.wrongAccount}
            href={`/api/auth/sign-out?langue=${locale}`}
            cta={dict.platform.auth.signOut}
          />
        }
      >
        <Button asChild>
          <a href={href("portal", locale)}>{dict.platform.portal.title}</a>
        </Button>
      </AuthShell>
    );
  }

  // Déjà connecté : inutile de repasser par le fournisseur.
  if (session) redirect(nextPath || (await landingHref(session.user, null)));

  const target = new URLSearchParams({ langue: locale });
  if (nextPath) target.set("suivant", nextPath);
  redirect(`/api/auth/sign-in?${target.toString()}`);
}
