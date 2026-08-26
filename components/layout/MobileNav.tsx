"use client";

import * as React from "react";

import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import ExpandableMenuNavbar from "@/components/ruixen/expandable-menu-navbar";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

export type MobileNavSection = {
  title?: string;
  items: { label: string; href: string; meta?: string }[];
};

type MobileNavProps = {
  locale: Locale;
  dict: Dictionary;
  brandName: string;
  sections: MobileNavSection[];
};

/**
 * Navigation mobile — Ruixen UI « Expandable Menu Navbar ».
 *
 * La carte repliée fait office de barre : elle s'ouvre en ressort sur la
 * hauteur utile, se referme sur Échap, au clic sur le voile ou dès qu'un lien
 * est suivi. Elle est posée en `fixed`, mais seul le panneau capte le
 * pointeur : menu fermé, la page reste entièrement cliquable.
 */
export function MobileNav({ locale, dict, brandName, sections }: MobileNavProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[min(560px,86svh)] xl:hidden">
      <ExpandableMenuNavbar
        brand={
          <span className="grid size-6 place-items-center rounded-full border border-[var(--copper)]/55 bg-[var(--copper)]/12 font-heading text-[11px] font-bold text-[var(--copper-deep)]">
            D
          </span>
        }
        brandLabel={brandName}
        sections={sections}
        status=""
        version=""
        shortcut="M"
        surface={false}
        height="100%"
        fitContent
        labels={{ close: dict.common.close, open: dict.common.menu }}
        navLabel={dict.common.mainNav}
        trailing={
          <LocaleSwitcher
            locale={locale}
            label={dict.common.language}
            tone="light"
            className="border-border/70 bg-background/70"
          />
        }
      />
    </div>
  );
}
