import { ArrowUpRight } from "lucide-react";

import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { MobileNav, type MobileNavSection } from "@/components/layout/MobileNav";
import { SiteNav } from "@/components/layout/SiteNav";
import { legalNavKeys, secondaryNavKeys } from "@/components/layout/Navigation";
import { LiquidCtaLink } from "@/components/liquefy/LiquidCtaLink";
import NavbarSplit from "@/components/ruixen/navbar-split";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href, routes, type RouteKey } from "@/lib/routes";
import { siteConfig } from "@/lib/site";

type HeaderProps = {
  locale: Locale;
  dict: Dictionary;
  /**
   * Routes réellement alimentées. Une rubrique vide n'est pas retirée du site
   * — elle reste accessible et indexée — mais elle n'est pas mise en avant
   * dans la navigation principale.
   */
  populated: Partial<Record<RouteKey, boolean>>;
};

/** Rubriques candidates à la barre principale, dans l'ordre du récit. */
const primaryKeys: RouteKey[] = ["about", "projects", "datakle", "services", "blog"];

/**
 * En-tête du site — Ruixen UI « Navbar Split » comme structure, avec la barre
 * à bascule « Hover Gradient NavBar » en navigation et l'appel à l'action en
 * verre liquide (Liquefy).
 *
 * Le composant reste un composant serveur : seuls la navigation (qui lit le
 * chemin courant), le sélecteur de langue et le menu mobile sont clients.
 */
export function Header({ locale, dict, populated }: HeaderProps) {
  const visible = (key: RouteKey) => populated[key] !== false;
  const navKeys = primaryKeys.filter(visible);

  const items = navKeys.map((key) => ({ label: routes[key].label[locale], href: href(key, locale) }));

  const mobileSections: MobileNavSection[] = [
    {
      items: [
        { label: routes.home.label[locale], href: href("home", locale) },
        ...items,
      ],
    },
    {
      title: dict.footer.resources,
      items: secondaryNavKeys
        .filter(visible)
        .map((key) => ({ label: routes[key].label[locale], href: href(key, locale) })),
    },
    {
      title: dict.footer.legal,
      items: legalNavKeys.map((key) => ({ label: routes[key].label[locale], href: href(key, locale) })),
    },
  ].filter((section) => section.items.length > 0);

  return (
    <>
      {/* Mobile : la carte dépliable tient lieu de barre, en `fixed`. */}
      <MobileNav locale={locale} dict={dict} brandName={siteConfig.name} sections={mobileSections} />
      <div className="h-[72px] lg:hidden" aria-hidden="true" />

      <NavbarSplit
        className="sticky top-0 z-40 hidden border-white/10 bg-[var(--navy-950)]/94 text-white shadow-[0_8px_30px_rgb(0_0_0_/_0.08)] backdrop-blur-xl lg:block"
        innerClassName="mx-auto h-[76px] w-full max-w-[1440px] px-5 sm:px-10 lg:px-[130px]"
        logoHref={href("home", locale)}
        logo={
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full border border-[var(--copper)]/55 bg-[var(--copper)]/10 font-heading text-sm font-bold text-[var(--copper-soft)]">
              D
            </span>
            <span>
              <span className="block font-heading text-[18px] font-semibold tracking-[-.03em]">
                {siteConfig.name}
              </span>
              <span className="block text-[9px] font-semibold uppercase tracking-[.16em] text-white/50">
                {siteConfig.baseline[locale]}
              </span>
            </span>
          </span>
        }
        navSlot={<SiteNav items={items} label={dict.common.mainNav} />}
        trailing={
          <>
            <LocaleSwitcher
              locale={locale}
              label={dict.common.language}
              className="border-white/18 bg-white/5 text-white"
            />
            <LiquidCtaLink
              href={href("contact", locale)}
              iconAfter={<ArrowUpRight aria-hidden="true" className="size-4" />}
            >
              {dict.common.contactCta}
            </LiquidCtaLink>
          </>
        }
      />
    </>
  );
}
