"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Ruixen UI — Navbar Floating.
 *
 * Adaptations Daguerre : la liste de liens codée en dur et le bouton
 * « Get Started » deviennent `navSlot` (la barre à bascule de
 * `HoverGradientNavBar`) et `trailing` (langue + appel à l'action), comme
 * pour `NavbarSplit`. La pilule flottante — marge de respiration, coins
 * arrondis complets, fond translucide et flou d'arrière-plan — reste celle
 * du composant d'origine.
 */
export interface NavbarFloatingProps {
  logo?: React.ReactNode;
  logoHref?: string;
  leftLinks?: { label: string; href: string; active?: boolean }[];
  navSlot?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

export default function NavbarFloating({
  logo = <span className="font-semibold">Logo</span>,
  logoHref = "/",
  leftLinks,
  navSlot,
  trailing,
  className,
  innerClassName,
}: NavbarFloatingProps) {
  return (
    <div className={cn("w-full px-4 py-4", className)}>
      <header
        className={cn(
          "mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 rounded-full border px-5 shadow-sm backdrop-blur",
          innerClassName,
        )}
      >
        <Link href={logoHref} className="flex min-w-0 items-center">
          {logo}
        </Link>
        {navSlot ?? (
          <nav className="hidden items-center gap-1 md:flex">
            {(leftLinks ?? []).map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                aria-current={link.active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                  link.active ? "bg-accent text-foreground" : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2">{trailing}</div>
      </header>
    </div>
  );
}
