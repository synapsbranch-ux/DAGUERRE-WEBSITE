"use client";

import { usePathname } from "next/navigation";
import {
  Bell,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Library,
  MessagesSquare,
  Newspaper,
  UserRound,
} from "lucide-react";

import { HoverGradientNavBar } from "@/components/ruixen/hover-gradient-navbar";

export type PortalNavItem = {
  key: string;
  label: string;
  href: string;
  /** Compteur d'éléments réclamant une action ; `0` n'affiche rien. */
  count?: number;
};

const ICONS: Record<string, React.ReactNode> = {
  overview: <LayoutDashboard aria-hidden="true" />,
  articles: <Newspaper aria-hidden="true" />,
  resources: <Library aria-hidden="true" />,
  quotes: <FileText aria-hidden="true" />,
  messages: <MessagesSquare aria-hidden="true" />,
  projects: <FolderKanban aria-hidden="true" />,
  notifications: <Bell aria-hidden="true" />,
  profile: <UserRound aria-hidden="true" />,
};

/**
 * Navigation de l'espace client — Ruixen UI « Hover Gradient NavBar », la même
 * barre que la navigation principale du site.
 *
 * Le seul travail fait ici est de marquer l'entrée courante et d'ajouter les
 * compteurs au libellé. La barre défile horizontalement sous `md` : huit
 * entrées ne tiennent pas sur un téléphone, et un menu escamotable de plus
 * ferait un geste supplémentaire à chaque navigation.
 */
export function PortalNav({ items, label }: { items: PortalNavItem[]; label: string }) {
  const pathname = usePathname() ?? "";

  return (
    <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <HoverGradientNavBar
        aria-label={label}
        className="min-w-max"
        items={items.map((item) => ({
          label: item.count ? `${item.label} (${item.count})` : item.label,
          href: item.href,
          icon: ICONS[item.key],
          current: pathname === item.href || pathname.startsWith(`${item.href}/`),
        }))}
      />
    </div>
  );
}
