import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { href, routes, type RouteKey } from "@/lib/routes";

/** Entrées de la navigation principale, dans l'ordre de la maquette. */
export const mainNavKeys: RouteKey[] = [
  "about",
  "projects",
  "datakle",
  "services",
];

/** Entrées secondaires, présentes seulement dans le pied de page. */
export const secondaryNavKeys: RouteKey[] = ["engagement", "blog", "cv", "skills", "research", "links"];

/** Informations légales. */
export const legalNavKeys: RouteKey[] = ["legal", "privacy"];

type NavigationProps = {
  locale: Locale;
  /** `horizontal` pour l'en-tête, `vertical` pour le panneau mobile. */
  orientation?: "horizontal" | "vertical";
  keys?: RouteKey[];
  className?: string;
};

/**
 * Liste de navigation réutilisable.
 *
 * Les URL passent par `href()` : en anglais, « Réalisations » pointe vers
 * `/en/portfolio` et non vers le chemin interne français.
 */
export function Navigation({
  locale,
  orientation = "horizontal",
  keys = mainNavKeys,
  className = "",
}: NavigationProps) {
  const listClasses =
    orientation === "horizontal"
      ? "flex items-center gap-7 text-[13px] font-semibold text-white/72"
      : "flex flex-col gap-0.5 text-[15px]";

  return (
    <ul className={`${listClasses} ${className}`}>
      {keys.map((key) => (
        <li key={key}>
          <Link
            href={href(key, locale)}
            className="block py-1 transition-colors hover:text-[var(--copper-soft)] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--copper-soft)]"
          >
            {routes[key].label[locale]}
          </Link>
        </li>
      ))}
    </ul>
  );
}
