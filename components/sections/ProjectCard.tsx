import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import {
  CutoutCard,
  CutoutCardContent,
  CutoutCardFooter,
  CutoutCardImage,
  CutoutCardInsetLabel,
  CutoutCardMedia,
  CutoutCardOverlay,
  cutoutCardSurfaceClassName,
  CutoutCorner,
} from "@/components/cult/cutout-card";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/lib/i18n";
import { isUnconfiguredRemoteImage, resolveKnownImageSource } from "@/lib/media/assets";
import { href } from "@/lib/routes";
import type { Project } from "@/lib/types";

type ProjectCardProps = {
  project: Project;
  locale: Locale;
  /** Taille de rendu déclarée à `next/image`. */
  sizes?: string;
};

/**
 * Carte de réalisation — Cult UI « Cutout Card ».
 *
 * La découpe d'angle, le survol et l'apparition en cascade viennent du
 * composant ; le contenu vient entièrement du CMS. L'année et la première
 * catégorie occupent l'étiquette encastrée, les technologies la barre basse.
 *
 * La carte entière est un lien : `CutoutCard` ne rend qu'un `div`, il est donc
 * enveloppé plutôt que transformé — le survol continue de fonctionner et la
 * cible reste unique pour le clavier.
 */
export function ProjectCard({ project, locale, sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" }: ProjectCardProps) {
  const url = href("projects", locale, project.slug);
  const image = project.image ? resolveKnownImageSource(project.image) : null;
  const label = project.kicker || project.categories[0];

  return (
    <Link
      href={url}
      className="group block h-full rounded-[24px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--copper)]"
    >
      <CutoutCard className={`${cutoutCardSurfaceClassName} h-full`}>
        {image ? (
          <CutoutCardMedia className="h-56">
            <CutoutCardImage
              alt=""
              src={image}
              sizes={sizes}
              unoptimized={isUnconfiguredRemoteImage(image)}
            />
            <CutoutCardOverlay />
            {label ? (
              <CutoutCardInsetLabel className="bottom-0 left-0 rounded-tr-[20px] bg-card px-5 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--copper-deep)]">
                  {label}
                </span>
                <CutoutCorner className="absolute -bottom-px -right-[31px] rotate-90 text-card" />
                <CutoutCorner className="absolute -left-px -top-[31px] rotate-90 text-card" />
              </CutoutCardInsetLabel>
            ) : null}
          </CutoutCardMedia>
        ) : null}

        <CutoutCardContent>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {project.year}
          </p>
          <h3 className="mb-2 text-balance font-heading text-xl leading-snug tracking-[-0.02em]">
            {project.title}
          </h3>
          {project.summary ? (
            <p className="mb-4 text-pretty text-sm leading-relaxed text-muted-foreground">
              {project.summary}
            </p>
          ) : null}

          <CutoutCardFooter className="border-t border-border/80 pt-4">
            <ul className="flex flex-wrap gap-1.5">
              {project.technologies.slice(0, 3).map((technology) => (
                <li key={technology}>
                  <Badge variant="outline">{technology}</Badge>
                </li>
              ))}
            </ul>
            <ArrowUpRight
              aria-hidden="true"
              className="ml-auto size-4 shrink-0 text-[var(--copper-deep)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </CutoutCardFooter>
        </CutoutCardContent>
      </CutoutCard>
    </Link>
  );
}
