import Link from "next/link";

import ScrollBurnText from "@/components/ruixen/scroll-burn-text";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import type { HomeSection } from "@/lib/types";

type EngagementPreviewProps = {
  locale: Locale;
  dict: Dictionary;
  /** Surcharges d’en-tête pilotées depuis le CMS. */
  section?: HomeSection;
};

/**
 * Engagement sur l'accueil.
 *
 * Ruixen UI « Scroll Burn Text » : la déclaration se consume phrase par
 * phrase au fil du défilement, puis découvre la suivante. Sous
 * `prefers-reduced-motion`, le composant rend les phrases posées, sans
 * combustion ; la version complète est de toute façon doublée d'un texte
 * lisible par les lecteurs d'écran.
 *
 * La déclaration vient du CMS (`HomeSection`) ou du dictionnaire : rien n'est
 * inventé ici, et la citation n'est jamais attribuée à un tiers.
 */
export function EngagementPreview({ locale, dict, section: cms }: EngagementPreviewProps) {
  const section = dict.home.engagement;
  const statement = cms?.title || section.statement;

  /* Une phrase par écran : le composant consacre une piste de défilement à
     chaque bloc, et une phrase entière tient mieux la lecture qu'un paragraphe. */
  const sentences = statement
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return (
    <section id="engagement" className="scroll-mt-24 bg-[var(--navy-950)] text-white">
      <Container className="pt-[var(--band-space)]">
        <p className="eyebrow-light">{cms?.eyebrow || section.eyebrow}</p>
      </Container>

      <ScrollBurnText
        sections={sentences.length ? sentences : [statement]}
        hint={section.cta}
        runway="150vh"
        surfaceClassName="bg-[var(--navy-950)] text-white"
      />

      <Container className="pb-[var(--band-space)]">
        <Button asChild size="cta" variant="band">
          <Link href={href("engagement", locale)}>{section.cta} →</Link>
        </Button>
      </Container>
    </section>
  );
}
