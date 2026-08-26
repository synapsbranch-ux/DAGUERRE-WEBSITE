import { ArrowUpRight, FolderGit2, Globe, Link2, Mail, type LucideIcon, Phone } from "lucide-react";

import { SocialPreviewDock, type SocialPreviewItem } from "@/components/ruixen/social-preview-dock";
import type { SocialLink } from "@/lib/types";

/**
 * Icône lucide déduite du domaine — mêmes règles que le pied de page
 * (`components/layout/Footer.tsx`) : lucide-react v1 n'a plus d'icônes de
 * marque, le libellé du lien saisi au CMS nomme la plateforme.
 */
function socialIcon(url: string): LucideIcon {
  const value = url.toLowerCase();
  if (value.startsWith("mailto:")) return Mail;
  if (value.startsWith("tel:")) return Phone;
  if (value.includes("github") || value.includes("gitlab")) return FolderGit2;
  if (value.includes("linkedin")) return Link2;
  return Globe;
}

/** Nom d'hôte lisible, sans le `www.` initial ; vide pour `mailto:`/`tel:`. */
function hostFor(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Fiche de survol générique : libellé, domaine, indication d'ouverture externe. */
function LinkPreviewCard({ link }: { link: SocialLink }) {
  const host = hostFor(link.url);

  return (
    <div className="w-[260px] p-4">
      <p className="text-sm font-medium">{link.label}</p>
      {host ? <p className="mt-1 truncate text-xs text-muted-foreground">{host}</p> : null}
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
        Ouvrir <ArrowUpRight aria-hidden="true" className="size-3" />
      </p>
    </div>
  );
}

/**
 * Réseaux sociaux — Ruixen UI « Social Preview Dock ».
 *
 * Le composant d'origine est bâti autour de trois plateformes précises
 * (GitHub, LinkedIn, X), avec une carte dédiée à chacune et une lecture en
 * direct du profil GitHub. La collection `SocialLink` du CMS est générique —
 * n'importe quelle plateforme, saisie librement — donc `items` remplace le
 * profil : icône générique déduite de l'URL, fiche de survol générique. La
 * lecture en direct (`live`) est désactivée : rien n'y correspond ici.
 */
export function SocialDock({ links, email }: { links: SocialLink[]; email?: string }) {
  if (links.length === 0) return null;

  const items: SocialPreviewItem[] = links.map((link) => {
    const Icon = socialIcon(link.url);
    return {
      id: link.id,
      label: link.label,
      href: link.url,
      icon: <Icon aria-hidden="true" />,
      card: <LinkPreviewCard link={link} />,
    };
  });

  return <SocialPreviewDock items={items} email={email} />;
}
