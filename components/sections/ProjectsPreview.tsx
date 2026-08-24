import Link from "next/link";

import { ProjectCard } from "@/components/sections/ProjectCard";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import type { HomeSection, Project } from "@/lib/types";

type ProjectsPreviewProps = {
  locale: Locale;
  dict: Dictionary;
  projects: Project[];
  /** Surcharges d’en-tête pilotées depuis le CMS. */
  section?: HomeSection;
};

/**
 * Aperçu des réalisations sur l'accueil.
 *
 * Maquette : titre de section aligné à gauche, lien « Tout le portfolio → »
 * aligné en bas à droite, puis trois cartes.
 */
export function ProjectsPreview({ locale, dict, projects, section: cms }: ProjectsPreviewProps) {
  const section = dict.home.projects;
  const visibleProjects = projects.slice(0, 3);

  if (visibleProjects.length === 0) return null;

  return (
    <Container>
      <section id="realisations" className="scroll-mt-24 py-20 sm:py-24 lg:py-30">
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex-1">
            <p className="eyebrow">{cms?.eyebrow || section.eyebrow}</p>
            <h2 className="mt-4 max-w-[20ch] text-3xl leading-tight sm:text-[48px]">
              {cms?.title || section.title}
            </h2>
          </div>
          <Button asChild variant="ghost">
            <Link href={href("projects", locale)}>{dict.common.allProjects} →</Link>
          </Button>
        </div>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProjects.map((project) => (
              <li key={project.slug}>
                <ProjectCard project={project} locale={locale} />
              </li>
            ))}
          </ul>
      </section>
    </Container>
  );
}
