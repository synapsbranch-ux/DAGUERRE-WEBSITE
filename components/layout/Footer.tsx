import { FolderGit2, Globe, Link2, Mail, Phone } from "lucide-react";

import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";
import { legalNavKeys, mainNavKeys, secondaryNavKeys } from "@/components/layout/Navigation";
import FooterPro from "@/components/ruixen/footer-pro";
import { WordmarkFooter } from "@/components/ruixen/wordmark-footer";
import { getSiteSettings, getSocialLinks } from "@/lib/content";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import type { PopulatedRoutes } from "@/lib/navigation";
import { href, routes, type RouteKey } from "@/lib/routes";
import { organization, siteConfig } from "@/lib/site";

type FooterProps = {
  locale: Locale;
  dict: Dictionary;
  populated: PopulatedRoutes;
};

/**
 * Icône lucide déduite du domaine d'un lien social géré au CMS, déjà rendue
 * en élément.
 *
 * lucide-react v1 ne fournit plus d'icônes de marque : on retient donc des
 * pictogrammes génériques, et c'est le libellé du lien — saisi au CMS — qui
 * nomme la plateforme pour les lecteurs d'écran. Rendue ici plutôt que
 * renvoyée comme référence de composant : `Footer` est un composant serveur,
 * et une référence de composant ne peut pas franchir la frontière vers
 * `FooterPro`, qui est client.
 */
function socialIcon(url: string): React.ReactNode {
  const value = url.toLowerCase();
  if (value.startsWith("mailto:")) return <Mail aria-hidden="true" />;
  if (value.startsWith("tel:")) return <Phone aria-hidden="true" />;
  if (value.includes("github") || value.includes("gitlab")) return <FolderGit2 aria-hidden="true" />;
  if (value.includes("linkedin")) return <Link2 aria-hidden="true" />;
  return <Globe aria-hidden="true" />;
}

/**
 * Pied de page — Ruixen UI « Footer Pro » pour les colonnes et la barre basse,
 * surmonté du mot-symbole « Wordmark Footer » de la même bibliothèque.
 *
 * Les colonnes suivent la navigation sensible au contenu : une rubrique vide
 * n'y apparaît pas non plus.
 */
export async function Footer({ locale, dict, populated }: FooterProps) {
  const year = new Date().getFullYear();
  const [managedLinks, settings] = await Promise.all([getSocialLinks(), getSiteSettings(locale)]);

  const visible = (key: RouteKey) => populated[key] !== false;
  const email =
    settings?.email && !settings.email.includes("example.com") ? settings.email : undefined;
  const phone = settings?.phone || undefined;

  const column = (title: string, keys: RouteKey[]) => ({
    title,
    links: keys
      .filter(visible)
      .map((key) => ({ label: routes[key].label[locale], href: href(key, locale) })),
  });

  const contactLinks = [
    { label: dict.common.contactCta, href: href("contact", locale) },
    ...(email ? [{ label: email, href: `mailto:${email}` }] : []),
    ...(phone ? [{ label: phone, href: `tel:${phone.replace(/\s+/g, "")}` }] : []),
  ];

  const columns = [
    column(dict.footer.navigation, mainNavKeys.filter((key) => key !== "services")),
    column(dict.footer.resources, secondaryNavKeys),
    { title: dict.footer.presence, links: contactLinks },
  ].filter((entry) => entry.links.length > 0);

  return (
    <div className="mt-auto">
      {/*
       * Bande d'inscription à l'infolettre.
       *
       * Posée sur le fond clair juste avant le pied de page sombre : les
       * champs de saisie du système de design y restent lisibles, et le
       * formulaire ne se perd pas au milieu des colonnes de liens.
       */}
      <section className="border-t border-border bg-[var(--plate)]">
        <div className="mx-auto grid w-full max-w-[1440px] gap-8 px-5 py-12 sm:px-10 lg:grid-cols-2 lg:items-center lg:px-[130px]">
          <div>
            <p className="eyebrow">| {dict.platform.newsletter.title} |</p>
            <h2 className="mt-3 font-heading text-2xl leading-tight sm:text-3xl">
              {dict.platform.newsletter.lead}
            </h2>
          </div>
          <NewsletterSignup dict={dict} locale={locale} source="footer" variant="inline" />
        </div>
      </section>

      <FooterPro
        className="border-white/10 bg-[var(--navy-950)] text-white"
        containerClassName="max-w-[1440px] px-5 py-14 sm:px-10 lg:px-[130px] lg:py-18"
        brandMark={
          <span className="grid size-7 place-items-center rounded-full border border-[var(--copper)]/55 bg-[var(--copper)]/12 font-heading text-[11px] font-bold text-[var(--copper-soft)]">
            D
          </span>
        }
        brandName={settings?.brandName || siteConfig.name}
        description={settings?.footerText || siteConfig.baseline[locale]}
        columns={columns}
        socials={managedLinks.slice(0, 5).map((link) => ({
          icon: socialIcon(link.url),
          href: link.url,
          label: link.label,
          external: true,
        }))}
        bottomLinks={legalNavKeys.map((key) => ({
          label: routes[key].label[locale],
          href: href(key, locale),
        }))}
        statusText={`${organization.name} · ${locale === "fr" ? "Services analytiques" : "Analytics services"}`}
        copyright={`© ${year} ${siteConfig.name} · ${dict.footer.rights}`}
        trailing={
          <LocaleSwitcher
            locale={locale}
            label={dict.common.language}
            className="border-white/18 bg-white/5"
          />
        }
      />
      <WordmarkFooter
        brandName={siteConfig.name.split(" ").at(-1)?.toUpperCase() ?? siteConfig.name}
        background="var(--navy-950)"
        fontFamily="var(--font-heading)"
      />
    </div>
  );
}
