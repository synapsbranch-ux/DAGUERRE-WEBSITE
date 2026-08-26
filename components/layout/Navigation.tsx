import {
  Briefcase,
  Building2,
  FileText,
  FolderKanban,
  HandHeart,
  Library,
  Link2,
  type LucideIcon,
  Microscope,
  Newspaper,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";

import type { Locale } from "@/lib/i18n";
import { href, routes, type RouteKey } from "@/lib/routes";

/**
 * Entrées de la navigation principale.
 *
 * Le blogue était auparavant relégué au pied de page : il n'existait aucun
 * chemin vers les articles depuis l'en-tête.
 */
export const mainNavKeys: RouteKey[] = [
  "about",
  "projects",
  "datakle",
  "services",
  "blog",
];

/** Entrées secondaires, présentes seulement dans le pied de page. */
export const secondaryNavKeys: RouteKey[] = [
  "resources",
  "engagement",
  "cv",
  "skills",
  "research",
  "links",
];

/** Icône lucide associée à chaque route navigable. */
export const navIcons: Partial<Record<RouteKey, LucideIcon>> = {
  resources: Library,
  about: User,
  projects: FolderKanban,
  datakle: Building2,
  services: Briefcase,
  blog: Newspaper,
  engagement: HandHeart,
  cv: FileText,
  skills: Sparkles,
  research: Microscope,
  links: Link2,
};

/** Informations légales. */
export const legalNavKeys: RouteKey[] = ["legal", "privacy"];

type NavigationProps = {
  locale: Locale;
  /** `horizontal` pour l'en-tête, `vertical` pour le panneau mobile. */
  orientation?: "horizontal" | "vertical";
  keys?: RouteKey[];
  className?: string;
  /** Affiche l'icône lucide de chaque route devant son libellé. */
  showIcons?: boolean;
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
  showIcons = false,
}: NavigationProps) {
  const listClasses =
    orientation === "horizontal"
      ? "flex items-center gap-7 text-[13px] font-semibold text-white/72"
      : "flex flex-col gap-0.5 text-[15px]";

  return (
    <ul className={`${listClasses} ${className}`}>
      {keys.map((key) => {
        const Icon = showIcons ? navIcons[key] : undefined;

        return (
          <li key={key}>
            <Link
              href={href(key, locale)}
              className="flex items-center gap-2.5 py-1 transition-colors hover:text-[var(--copper-soft)] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--copper-soft)]"
            >
              {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0 opacity-70" /> : null}
              {routes[key].label[locale]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
