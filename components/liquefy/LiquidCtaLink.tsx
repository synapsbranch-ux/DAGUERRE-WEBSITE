"use client";

import { useLiquefyConfig, useLiquidGlass, useLiquidStyles } from "@liquefy-ui/react";
import Link from "next/link";
import * as React from "react";

type LiquidCtaLinkProps = {
  href: string;
  children: React.ReactNode;
  iconAfter?: React.ReactNode;
  iconBefore?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  tint?: string;
  className?: string;
};

/**
 * `LiquidButton` de Liquefy, mais en lien.
 *
 * Le composant publié rend un `<button>` et n'accepte ni `as` ni `asChild` :
 * un appel à l'action de navigation deviendrait donc un bouton, sans
 * préchargement Next ni sémantique de lien — et l'imbriquer dans un `<a>`
 * produirait du HTML invalide.
 *
 * On garde donc **le composant de la bibliothèque** — ses classes `lq-*`, ses
 * ressorts, son shader — et on ne remplace que l'élément hôte par un
 * `next/link`. Aucun style n'est réécrit ici : tout vient de `useLiquidStyles`
 * et `useLiquidGlass`, exportés par le paquet à cette fin.
 */
export function LiquidCtaLink({
  href,
  children,
  iconAfter,
  iconBefore,
  size = "md",
  tint,
  className,
}: LiquidCtaLinkProps) {
  const config = useLiquefyConfig();
  const resolvedTint = tint ?? config.tint;

  const [elementRef, canvasRef] = useLiquidGlass<HTMLAnchorElement>(undefined, {
    bounce: 0.075,
    intensity: config.intensity,
    lens: false,
    motion: config.motion,
    tilt: 2.4,
    tint: resolvedTint,
    webgl: config.webgl,
    wobbliness: config.wobbliness,
  });

  const root = useLiquidStyles("lq-button", {
    className,
    vars: { "--lq-button-tint": resolvedTint },
  });

  return (
    <Link
      href={href}
      className={root.className}
      data-liquid-size={size}
      ref={elementRef}
      style={root.style}
    >
      <span aria-hidden="true" className="lq-surface__edge" />
      {config.webgl && <canvas aria-hidden="true" className="lq-surface__shader" ref={canvasRef} />}
      <span className="lq-button__content">
        {iconBefore ? (
          <span className="lq-button__icon" data-position="before">
            {iconBefore}
          </span>
        ) : null}
        <span>{children}</span>
        {iconAfter ? (
          <span className="lq-button__icon" data-position="after">
            {iconAfter}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
