import Link from "next/link";

import { ProjectFan, type ProjectFanCard } from "@/components/sections/ProjectFan";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { isUnconfiguredRemoteImage, resolveKnownImageSource } from "@/lib/media/assets";
import { href } from "@/lib/routes";
import type { HomeSection, Project } from "@/lib/types";

type ProjectsPreviewProps = {
  locale: Locale;
  dict: Dictionary;
  projects: Project[];
  /** Surcharges d’en-tête pilotées depuis le CMS. */
  section?: HomeSection;
};

/** URL utilisable par l'éventail : seules les images résolues font une carte. */
function cardFor(project: Project, locale: Locale): ProjectFanCard | null {
  if (!project.image) return null;
  const source = resolveKnownImageSource(project.image);
  const src = typeof source === "string" ? source : source.src;

  return {
    id: project.slug,
    src,
    title: project.title,
    description: project.summary,
    href: href("projects", locale, project.slug),
    unoptimized: isUnconfiguredRemoteImage(source),
  };
}

/**
 * Aperçu des réalisations sur l'accueil.
 *
 * Ruixen UI « Image Card Fan » : les projets mis en avant sont tenus en main,
 * la carte choisie se lève et donne son titre et son résumé. Sélection au
 * clic, au clavier ou au glisser ; sous `prefers-reduced-motion`, le ressort
 * cède la place à une transition courte.
 *
 * Entièrement piloté par le CMS. Un projet sans visuel ne peut pas figurer
 * dans l'éventail : la bande n'est alors pas rendue du tout plutôt que
 * d'annoncer une absence de contenu sur la page d'accueil.
 */
export function ProjectsPreview({ locale, dict, projects, section: cms }: ProjectsPreviewProps) {
  const section = dict.home.projects;
  const cards = projects
    .slice(0, 5)
    .map((project) => cardFor(project, locale))
    .filter((card): card is ProjectFanCard => card !== null);

  if (cards.length === 0) return null;

  return (
    <section id="realisations" className="scroll-mt-24 py-[var(--band-space)]">
      <Container>
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex-1">
            <p className="eyebrow">{cms?.eyebrow || section.eyebrow}</p>
            <h2 className="mt-4 max-w-[20ch] text-3xl leading-tight sm:text-[48px]">
              {cms?.title || section.title}
            </h2>
            {cms?.lead ? (
              <p className="mt-4 max-w-[62ch] text-[15px] leading-7 text-muted-foreground">
                {cms.lead}
              </p>
            ) : null}
          </div>
          <Button asChild variant="ghost">
            <Link href={href("projects", locale)}>{dict.common.allProjects} →</Link>
          </Button>
        </div>

        <div className="mt-12">
          <ProjectFan cards={cards} cta={dict.common.readMore} />
        </div>
      </Container>
    </section>
  );
}
