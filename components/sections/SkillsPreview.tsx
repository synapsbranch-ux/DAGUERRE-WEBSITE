import Link from "next/link";

import { PerspectiveText } from "@/components/ruixen/perspective-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import type { HomeSection, SkillGroup } from "@/lib/types";

type SkillsPreviewProps = {
  locale: Locale;
  dict: Dictionary;
  /** Groupes de compétences actives, issus de la collection `Skill`. */
  groups: SkillGroup[];
  /** Surcharges d’en-tête pilotées depuis le CMS. */
  section?: HomeSection;
};

/**
 * Compétences sur l'accueil.
 *
 * Ruixen UI « Perspective Text » pose le mot d'ouverture sur un arc incliné :
 * du texte réel, projeté en SVG, qui reste sélectionnable et annoncé tel quel
 * aux lecteurs d'écran. Aucune animation — la bande fait partie du tiers calme
 * de la page.
 *
 * Alimentée par la collection `Skill` : une compétence désactivée dans le CMS
 * disparaît d'ici comme de la page dédiée. Sans compétence active, la bande
 * n'est pas rendue plutôt que d'afficher un cadre vide.
 */
export function SkillsPreview({ locale, dict, groups, section }: SkillsPreviewProps) {
  if (groups.length === 0) return null;

  const labels = dict.pages.skills;
  const heading = section?.title || labels.title;

  return (
    <section id="competences" className="scroll-mt-24 border-y border-border bg-[var(--surface-sunken)] py-[var(--band-space)]">
      <Container>
        <p className="eyebrow">{section?.eyebrow || labels.eyebrow}</p>

        <h2 className="mt-6 overflow-hidden text-[clamp(3rem,11vw,9rem)] leading-[0.9] text-[var(--navy-900)]">
          <PerspectiveText
            text={heading}
            as="span"
            curve={0.05}
            tilt={26}
            stretch={1.28}
            fontFamily="var(--font-heading)"
          />
        </h2>

        {section?.lead ? (
          <p className="mt-8 max-w-[62ch] text-[15px] leading-7 text-muted-foreground">
            {section.lead}
          </p>
        ) : null}

        <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <li key={group.slug} className="border-t border-border pt-5">
              <h3 className="font-heading text-lg tracking-[-0.02em]">{group.name}</h3>
              {group.description ? (
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {group.description}
                </p>
              ) : null}
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {group.skills.map((skill) => (
                  <li key={skill.name}>
                    <Badge variant={skill.featured ? "secondary" : "outline"}>{skill.name}</Badge>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <Button asChild variant="ghost" className="mt-10">
          <Link href={href("skills", locale)}>{labels.title} →</Link>
        </Button>
      </Container>
    </section>
  );
}
