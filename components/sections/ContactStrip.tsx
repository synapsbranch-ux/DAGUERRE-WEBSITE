import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import { organization, siteConfig, socialLinks } from "@/lib/site";

type ContactStripProps = {
  dict: Dictionary;
};

/**
 * Bandeau de coordonnées glissé entre le héros et la section « À propos ».
 *
 * Maquette : trois cellules séparées par des filets verticaux — coordonnées,
 * contact Datakle, puis les liens sociaux alignés à droite. Encadré en haut et
 * en bas par un filet pleine largeur.
 */
export function ContactStrip({ dict }: ContactStripProps) {
  const strip = dict.home.strip;

  return (
    <div className="border-y border-border">
      <Container>
        <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex flex-col gap-1 py-6 sm:pr-8">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--brass-deep)]">
              {strip.contact}
            </p>
            <p className="text-sm">
              <a href={`mailto:${siteConfig.email}`} className="underline-offset-4 hover:underline">
                {siteConfig.email}
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-1 py-6 sm:px-8">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--brass-deep)]">
              {strip.mandates}
            </p>
            <p className="text-sm">{organization.name}</p>
          </div>

          <div className="flex items-center gap-2 py-6 sm:justify-end sm:pl-8">
            {socialLinks.map((link) => (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs transition-colors hover:bg-foreground/7"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
