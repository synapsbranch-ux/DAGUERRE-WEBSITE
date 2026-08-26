"use client";
import Link from "next/link";
import React from "react";
import { motion, Variants } from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Ruixen UI — Hover Gradient NavBar.
 *
 * Adaptations Daguerre :
 * - les entrées viennent des props (la version d'origine embarquait une
 *   démo « Home / Messages / Settings ») ;
 * - `next/link` remplace `<a>` pour conserver le préchargement ;
 * - la lueur radiale par entrée reprend le cuivre de la charte au lieu des
 *   bleus et violets de la démo ;
 * - `variant="inline"` permet de poser la barre dans l'en-tête plutôt qu'en
 *   dock flottant.
 *
 * L'interaction — bascule 3D de l'entrée et halo suivant le survol — est
 * celle du composant d'origine.
 */

export interface HoverGradientMenuItem {
  icon?: React.ReactNode;
  label: string;
  href: string;
  /** Dégradé du halo. Cuivre de la charte par défaut. */
  gradient?: string;
  current?: boolean;
}

const COPPER_GLOW =
  "radial-gradient(circle, rgba(196,124,75,0.28) 0%, rgba(196,124,75,0.10) 50%, rgba(196,124,75,0) 100%)";

const itemVariants: Variants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
};

const backVariants: Variants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
};

const glowVariants: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 2,
    transition: {
      opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
      scale: { duration: 0.5, type: "spring", stiffness: 300, damping: 25 },
    },
  },
};

const sharedTransition = {
  type: "spring" as const,
  stiffness: 100,
  damping: 20,
  duration: 0.5,
};

export interface HoverGradientNavBarProps {
  items: HoverGradientMenuItem[];
  /** `inline` : intégrée à l'en-tête. `dock` : barre flottante d'origine. */
  variant?: "inline" | "dock";
  className?: string;
  "aria-label"?: string;
}

export function HoverGradientNavBar({
  items,
  variant = "inline",
  className,
  "aria-label": ariaLabel,
}: HoverGradientNavBarProps): React.JSX.Element {
  const nav = (
    <motion.nav
      aria-label={ariaLabel}
      className={cn(
        variant === "dock"
          ? "relative mx-auto w-full rounded-none border-t border-white/12 bg-[var(--navy-950)]/92 px-2 py-2 backdrop-blur-lg md:w-fit md:rounded-3xl md:border md:px-4 md:py-3"
          : "relative",
        className,
      )}
      initial="initial"
      whileHover="hover"
    >
      <ul
        className={cn(
          "relative z-10 flex items-center",
          variant === "dock" ? "justify-around gap-1 md:justify-center md:gap-3" : "gap-1",
        )}
      >
        {items.map((item) => {
          const content = (
            <>
              {item.icon ? (
                <span className="transition-colors duration-300">{item.icon}</span>
              ) : null}
              <span className="font-semibold">{item.label}</span>
            </>
          );

          return (
            <motion.li key={item.href} className={cn("relative", variant === "dock" && "flex-1 md:flex-none")}>
              <motion.div
                className="group relative block overflow-visible rounded-xl md:rounded-2xl"
                style={{ perspective: "600px" }}
                whileHover="hover"
                initial="initial"
              >
                {/* Halo propre à l'entrée survolée. */}
                <motion.div
                  className="pointer-events-none absolute inset-0 z-0 rounded-xl md:rounded-2xl"
                  variants={glowVariants}
                  style={{ background: item.gradient ?? COPPER_GLOW, opacity: 0 }}
                />
                {/* Face avant. */}
                <motion.span
                  className="relative z-10 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13px] transition-colors md:rounded-2xl"
                  variants={itemVariants}
                  transition={sharedTransition}
                  style={{ transformStyle: "preserve-3d", transformOrigin: "center bottom" }}
                >
                  {content}
                </motion.span>
                {/* Face arrière — celle qui monte au survol. */}
                <motion.span
                  className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13px] text-[var(--copper-soft)] transition-colors md:rounded-2xl"
                  variants={backVariants}
                  transition={sharedTransition}
                  aria-hidden="true"
                  style={{
                    transformStyle: "preserve-3d",
                    transformOrigin: "center top",
                    transform: "rotateX(90deg)",
                  }}
                >
                  {content}
                </motion.span>
                {/* Le lien couvre la pile : une seule cible, un seul nom accessible. */}
                <Link
                  href={item.href}
                  aria-current={item.current ? "page" : undefined}
                  className={cn(
                    "absolute inset-0 z-20 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--copper-soft)] md:rounded-2xl",
                    item.current && "shadow-[inset_0_-2px_0_0_var(--copper)]",
                  )}
                >
                  <span className="sr-only">{item.label}</span>
                </Link>
              </motion.div>
            </motion.li>
          );
        })}
      </ul>
    </motion.nav>
  );

  if (variant === "dock") {
    return (
      <div className="fixed bottom-0 left-0 z-50 w-full md:bottom-4 md:left-1/2 md:w-auto md:-translate-x-1/2">
        {nav}
      </div>
    );
  }

  return nav;
}

export default HoverGradientNavBar;
