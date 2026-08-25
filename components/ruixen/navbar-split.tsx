"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Ruixen UI — Navbar Split.
 *
 * Adaptations Daguerre : le bouton « Get Started » codé en dur devient un
 * emplacement `trailing`, et la liste de liens de gauche peut être remplacée
 * par `navSlot` (la barre à bascule de `HoverGradientNavBar`). La structure
 * — marque à gauche, navigation, actions à droite — reste celle du composant.
 */
export interface NavbarSplitProps {
  logo?: React.ReactNode;
  /** Cible de la marque. `/` par défaut, comme dans le composant d'origine. */
  logoHref?: string;
  leftLinks?: { label: string; href: string; active?: boolean }[];
  rightLinks?: { label: string; href: string }[];
  /** Remplace la liste de gauche par un bloc de navigation complet. */
  navSlot?: React.ReactNode;
  /** Actions de droite : langue, appel à l'action, menu mobile. */
  trailing?: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

export default function NavbarSplit({
  logo = <span className="font-semibold">Logo</span>,
  logoHref = "/",
  leftLinks,
  rightLinks,
  navSlot,
  trailing,
  className,
  innerClassName,
}: NavbarSplitProps) {
  return (
    <header className={cn("w-full border-b", className)}>
      <div className={cn("flex h-14 items-center justify-between gap-4 px-4", innerClassName)}>
        <div className="flex min-w-0 items-center gap-8">
          <Link href={logoHref} className="flex items-center">
            {logo}
          </Link>
          {navSlot ?? (
            <nav className="hidden items-center gap-6 lg:flex">
              {(leftLinks ?? []).map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  aria-current={link.active ? "page" : undefined}
                  className={cn(
                    "text-sm transition-colors hover:text-foreground",
                    link.active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          {rightLinks?.length ? (
            <nav className="hidden items-center gap-6 lg:flex">
              {rightLinks.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
          {trailing}
        </div>
      </div>
    </header>
  );
}
