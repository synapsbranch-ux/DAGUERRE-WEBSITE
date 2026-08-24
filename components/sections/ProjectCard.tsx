import Link from "next/link";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/lib/i18n";
import { isUnconfiguredRemoteImage, resolveKnownImageSource } from "@/lib/media/assets";
import { href } from "@/lib/routes";
import type { Project } from "@/lib/types";

type ProjectCardProps = {
  project: Project;
  locale: Locale;
};

/**
 * Carte de réalisation, reprise de la maquette : visuel en haut séparé par un
 * filet, sur-titre laiton, titre sérif, une ligne de contexte, puis les
 * technologies. Fond transparent, bordure de 1 px — jamais d'ombre portée.
 */
export function ProjectCard({ project, locale }: ProjectCardProps) {
  const url = href("projects", locale, project.slug);
  const image = project.image ? resolveKnownImageSource(project.image) : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white/55 shadow-[0_12px_40px_rgb(7_19_33_/_0.05)] transition-[transform,border-color,box-shadow] hover:-translate-y-1 hover:border-[var(--copper)]/45 hover:shadow-[0_20px_55px_rgb(7_19_33_/_0.10)]">
      {image ? (
        <div className="relative aspect-[4/3] overflow-hidden border-b border-border bg-[var(--navy-850)]">
          <Image
            src={image}
            alt={project.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={75}
            unoptimized={isUnconfiguredRemoteImage(image)}
            className="image-zoom object-cover"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 px-6 py-6">
        {project.categories.length > 0 ? (
          <p className="text-[10px] uppercase tracking-[0.1em] text-primary">
            {project.categories.join(" · ")}
          </p>
        ) : null}

        <h3 className="text-xl leading-tight">
          <Link href={url} className="transition-colors hover:text-primary">
            {project.title}
          </Link>
        </h3>

        <p className="flex-1 text-[13.5px] leading-relaxed text-muted-foreground">
          {project.summary}
        </p>

        {project.technologies.length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {project.technologies.map((tech, index) => (
              <li key={tech}>
                <Badge variant={index === 0 ? "outline" : "secondary"}>{tech}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
