import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
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
 * Alimentée par la collection `Skill` : une compétence désactivée dans le CMS
 * disparaît d'ici comme de la page dédiée. Sans compétence active, la bande
 * n'est pas rendue plutôt que d'afficher un cadre vide.
 */
export function SkillsPreview({ locale, dict, groups, section }: SkillsPreviewProps) {
  if (groups.length === 0) return null;

  const labels = dict.pages.skills;

  return (
    <Container>
      <section id="competences" className="scroll-mt-24 py-20 sm:py-24">
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex-1">
            <p className="eyebrow">{section?.eyebrow || labels.eyebrow}</p>
            <h2 className="mt-4 max-w-[22ch] text-3xl leading-tight sm:text-[46px]">
              {section?.title || labels.title}
            </h2>
            {section?.lead ? (
              <p className="mt-4 max-w-[62ch] text-[15px] leading-7 text-muted-foreground">
                {section.lead}
              </p>
            ) : null}
          </div>
          <Button asChild variant="ghost">
            <Link href={href("skills", locale)}>{labels.title} →</Link>
          </Button>
        </div>

        <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, index) => (
            <li key={group.slug}>
              <Reveal delay={index * 60} className="h-full">
                <div className="h-full rounded-2xl border border-border bg-white/45 p-5">
                  <h3 className="text-lg">{group.name}</h3>
                  {group.description ? (
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{group.description}</p>
                  ) : null}
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {group.skills.map((skill) => (
                      <li key={skill.name}>
                        <Badge variant={skill.featured ? "secondary" : "outline"}>{skill.name}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
