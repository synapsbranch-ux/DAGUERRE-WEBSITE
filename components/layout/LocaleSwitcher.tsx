"use client";

import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { cn } from "@/lib/utils";
import { localeLabels, locales, type Locale } from "@/lib/i18n";
import { href, routeKeyForPath, routes } from "@/lib/routes";

type LocaleSwitcherProps = {
  locale: Locale;
  label: string;
  /** `dark` sur bande sombre (en-tête, pied de page), `light` sur papier. */
  tone?: "dark" | "light";
  className?: string;
};

/**
 * Bascule FR / EN, dessinée comme le contrôle segmenté de la maquette.
 *
 * ## Comment l'URL cible est trouvée
 *
 * 1. **Les `hreflang` de la page** sont la source la plus fiable : pour un
 *    article ou un projet, le slug est traduit et seul le contenu connaît la
 *    correspondance. `generateMetadata` les a déjà émis dans le `<head>`.
 * 2. **La table des routes** sert de repli pour les pages statiques.
 * 3. Faute de mieux, on renvoie vers l'accueil de l'autre langue plutôt que
 *    vers une URL qui n'existe pas.
 */
function resolveTarget(pathname: string, current: Locale, target: Locale): string {
  if (typeof document !== "undefined") {
    const link = document.querySelector<HTMLLinkElement>(
      `link[rel="alternate"][hreflang="${target}"]`,
    );
    if (link?.href) {
      try {
        return new URL(link.href).pathname;
      } catch {
        // href malformé : on poursuit avec le repli.
      }
    }
  }

  const rest = pathname.startsWith(`/${current}`) ? pathname.slice(current.length + 1) : pathname;
  const key = routeKeyForPath(current, rest);
  if (!key) return `/${target}`;

  const prefix = routes[key].path[current];
  const trimmed = rest.replace(/^\/+|\/+$/g, "");
  const extra = prefix && trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : "";
  const segments = extra.split("/").filter(Boolean);

  return href(key, target, ...segments);
}

export function LocaleSwitcher({ locale, label, tone = "dark", className }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  const go = React.useCallback(
    (target: Locale) => {
      if (target === locale) return;
      router.push(resolveTarget(pathname ?? `/${locale}`, locale, target));
    },
    [locale, pathname, router],
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-md border border-border text-[13px]",
        className,
      )}
    >
      {locales.map((code, index) => {
        const active = code === locale;

        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-current={active ? "true" : undefined}
            onClick={() => go(code)}
            className={cn(
              "px-3 py-1.5 transition-colors",
              index > 0 && "border-l border-current/15",
              active
                ? tone === "dark"
                  ? "bg-white/8 text-[var(--copper-soft)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--copper)_55%,transparent)]"
                  : "bg-[var(--copper-wash)] text-[var(--copper-deep)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--copper)_45%,transparent)]"
                : tone === "dark"
                  ? "text-white/55 hover:bg-white/8 hover:text-white"
                  : "text-muted-foreground hover:bg-[var(--copper-wash)] hover:text-foreground",
            )}
          >
            {localeLabels[code]}
          </button>
        );
      })}
    </div>
  );
}
