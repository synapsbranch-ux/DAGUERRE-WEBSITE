import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { MobileNav } from "@/components/layout/MobileNav";
import { Navigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { siteConfig } from "@/lib/site";

type HeaderProps = {
  locale: Locale;
  dict: Dictionary;
};

export function Header({ locale, dict }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--navy-950)]/94 text-white shadow-[0_8px_30px_rgb(0_0_0_/_0.08)] backdrop-blur-xl">
      <Container>
        <div className="flex h-[72px] items-center gap-6">
          <Link
            href={href("home", locale)}
            className="mr-auto flex items-center gap-3 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--copper-soft)]"
          >
            <span className="grid size-9 place-items-center rounded-full border border-[var(--copper)]/55 bg-[var(--copper)]/10 font-heading text-sm font-bold text-[var(--copper-soft)]">D</span>
            <span>
              <span className="block font-heading text-[18px] font-semibold tracking-[-.03em]">{siteConfig.name}</span>
              <span className="hidden text-[9px] font-semibold uppercase tracking-[.16em] text-white/50 sm:block">
                {siteConfig.baseline[locale]}
              </span>
            </span>
          </Link>

          <nav aria-label={dict.common.mainNav} className="hidden lg:block">
            <Navigation locale={locale} orientation="horizontal" />
          </nav>

          <div className="flex items-center gap-2.5">
            <LocaleSwitcher locale={locale} label={dict.common.language} className="border-white/18 bg-white/5 text-white" />
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href={href("contact", locale)}>
                {dict.common.contactCta} <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
            <MobileNav locale={locale} dict={dict} />
          </div>
        </div>
      </Container>
    </header>
  );
}
