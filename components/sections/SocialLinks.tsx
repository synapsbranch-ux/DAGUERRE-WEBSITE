import { ArrowUpRight } from "lucide-react";

import { Section } from "@/components/ui/Section";
import { getSocialLinks } from "@/lib/content";

type SocialLinksProps = {
  title: string;
  description?: string;
  /** Message affiché tant qu'aucun lien actif n'est enregistré. */
  emptyLabel: string;
};

/**
 * Réseaux sociaux, alimentés par la collection `SocialLink`.
 *
 * Seuls les liens **actifs** sont publiés : un profil préparé mais désactivé
 * dans le CMS n'apparaît nulle part, et rien n'est codé en dur ici.
 */
export async function SocialLinks({ title, description, emptyLabel }: SocialLinksProps) {
  const links = await getSocialLinks();

  return (
    <Section id="reseaux" title={title} description={description}>
      {links.length > 0 ? (
        <ul className="flex flex-wrap gap-2.5">
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer noopener me"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-4 text-sm transition-colors hover:border-[var(--copper)]/55 hover:bg-foreground/5"
              >
                {link.label}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </Section>
  );
}
