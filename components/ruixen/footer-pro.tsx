"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Ruixen UI — Footer Pro.
 *
 * Adaptations Daguerre : surface et gouttières pilotées par `className` /
 * `containerClassName` (le pied du site est une bande sombre pleine largeur),
 * liens sociaux pouvant être externes, emplacement `trailing` pour le
 * sélecteur de langue, et voyant d'état aux couleurs de la charte plutôt
 * qu'au vert de la démonstration.
 */

/* ── types ─────────────────────────────────────────────────────── */
interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface FooterSocial {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  label?: string;
  external?: boolean;
}

interface FooterProProps {
  /** Custom brand mark — any ReactNode (SVG, icon, emoji). Falls back to a default geometric mark. */
  brandMark?: React.ReactNode;
  brandName?: string;
  description?: string;
  columns?: FooterColumn[];
  socials?: FooterSocial[];
  bottomLinks?: FooterLink[];
  /** Status text shown with a breathing indicator dot. Pass `undefined` to hide. */
  statusText?: string;
  copyright?: string;
  className?: string;
  containerClassName?: string;
  /** Bloc libre en fin de barre basse — sélecteur de langue. */
  trailing?: React.ReactNode;
}

/* ── default brand mark ────────────────────────────────────────── */
function DefaultMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className="size-[18px]"
      aria-hidden="true"
    >
      <rect width="18" height="18" rx="5" className="fill-current" />
    </svg>
  );
}

/* ── defaults ──────────────────────────────────────────────────── */
const defaults = {
  brandName: "ruixen ui",
  description:
    "Modern, fast, and customizable React components — built with Tailwind CSS, TypeScript, and accessibility in mind.",
  columns: [
    {
      title: "Product",
      links: [
        { label: "Components", href: "#" },
        { label: "Templates", href: "#" },
        { label: "Pro", href: "#" },
        { label: "Changelog", href: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "#" },
        { label: "API Reference", href: "#" },
        { label: "Guides", href: "#" },
        { label: "Examples", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Contact", href: "#" },
      ],
    },
  ] as FooterColumn[],
  socials: [] as FooterSocial[],
  bottomLinks: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ] as FooterLink[],
  statusText: "All systems operational",
  copyright: `\u00A9 ${new Date().getFullYear()} ruixen ui`,
};

/* ── component ─────────────────────────────────────────────────── */
export default function FooterPro(props?: FooterProProps) {
  const brandMark = props?.brandMark;
  const brandName = props?.brandName ?? defaults.brandName;
  const description = props?.description ?? defaults.description;
  const columns = props?.columns ?? defaults.columns;
  const socials = props?.socials ?? defaults.socials;
  const bottomLinks = props?.bottomLinks ?? defaults.bottomLinks;
  const statusText = props?.statusText ?? defaults.statusText;
  const copyright = props?.copyright ?? defaults.copyright;
  const trailing = props?.trailing;

  return (
    <footer className={cn("border-t border-current/15 bg-background", props?.className)}>
      <div className={cn("mx-auto max-w-6xl px-6 py-12 lg:py-16", props?.containerClassName)}>
        {/* ── content: brand + columns ──────────────────────────── */}
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-16">
          {/* brand */}
          <div className="shrink-0 lg:max-w-[280px]">
            <div className="flex items-center gap-2.5">
              {brandMark ?? <DefaultMark />}
              <span className="text-[15px] font-[590] tracking-[-0.015em] text-current">
                {brandName}
              </span>
            </div>
            <p className="mt-4 text-[13px] leading-[1.6] text-current/60">
              {description}
            </p>
          </div>

          {/* columns */}
          <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-current/55">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="group/link inline-flex items-center text-[13px] text-current/65 transition-colors duration-150 hover:text-current"
                      >
                        <span className="transition-transform duration-150 group-hover/link:translate-x-0.5">
                          {link.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ── bottom ───────────────────────────────────────────── */}
        <div className="mt-14 border-t border-current/15 pt-6">
          {/* status indicator */}
          {statusText && (
            <div className="mb-4 flex items-center gap-2">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--copper-soft)]/60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[var(--copper)]" />
              </span>
              <span className="text-[11px] text-current/55">
                {statusText}
              </span>
            </div>
          )}

          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-[12px] text-current/50">{copyright}</p>

            <div className="flex items-center gap-5">
              {bottomLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-[12px] text-current/55 transition-colors duration-150 hover:text-current"
                >
                  {link.label}
                </Link>
              ))}

              {socials.length > 0 && bottomLinks.length > 0 && (
                <div className="h-3 w-px bg-current/20" />
              )}

              {socials.map(({ icon: Icon, href, label, external }, idx) => (
                <Link
                  key={idx}
                  href={href}
                  aria-label={label}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer noopener" : undefined}
                  className="text-current/55 transition-colors duration-150 hover:text-current"
                >
                  <Icon className="size-3.5" />
                </Link>
              ))}

              {trailing}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
