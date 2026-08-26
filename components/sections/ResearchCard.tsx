import { FileText, Link2 } from "lucide-react";

import {
  CutoutCard,
  CutoutCardContent,
  CutoutCardFooter,
  CutoutCardImage,
  CutoutCardMedia,
  CutoutCardOverlay,
  cutoutCardSurfaceClassName,
} from "@/components/cult/cutout-card";
import { Badge } from "@/components/ui/badge";
import { isUnconfiguredRemoteImage, resolveKnownImageSource } from "@/lib/media/assets";
import type { ResearchEntry } from "@/lib/types";

type ResearchCardProps = {
  entry: ResearchEntry;
  labels: { documents: string; publications: string };
};

/**
 * Travail de recherche — Cult UI « Cutout Card ».
 *
 * Même composant que les cartes de réalisation : découpe d'angle et survol
 * quand un visuel existe, sinon la carte reste un cadre texte — beaucoup de
 * travaux académiques n'ont pas d'image représentative, et il n'y en a pas
 * d'inventée pour combler ce vide.
 */
export function ResearchCard({ entry, labels }: ResearchCardProps) {
  const image = entry.image ? resolveKnownImageSource(entry.image) : null;

  return (
    <CutoutCard className={`${cutoutCardSurfaceClassName} h-full`}>
      {image ? (
        <CutoutCardMedia className="h-44">
          <CutoutCardImage
            alt=""
            src={image}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={isUnconfiguredRemoteImage(image)}
          />
          <CutoutCardOverlay />
        </CutoutCardMedia>
      ) : null}

      <CutoutCardContent>
        <div className="flex flex-wrap items-center gap-2">
          {entry.type ? <Badge variant="secondary">{entry.type}</Badge> : null}
          {entry.year ? <Badge variant="outline">{entry.year}</Badge> : null}
        </div>

        <h3 className="mt-3 text-balance font-heading text-xl leading-tight tracking-[-0.02em]">
          {entry.title}
        </h3>

        {entry.institution || entry.authors.length > 0 ? (
          <p className="mt-1.5 text-sm font-semibold text-muted-foreground">
            {[entry.authors.join(", "), entry.institution].filter(Boolean).join(" — ")}
          </p>
        ) : null}

        {entry.summary ? (
          <p className="mt-3 text-pretty text-sm leading-6 text-muted-foreground">{entry.summary}</p>
        ) : null}

        {entry.tags.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <li key={tag}>
                <Badge variant="outline">{tag}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        {entry.documentUrl || entry.externalUrl ? (
          <CutoutCardFooter className="mt-4 justify-start gap-4 border-t border-border/80 pt-4 text-sm font-semibold">
            {entry.documentUrl ? (
              <a
                href={entry.documentUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-[var(--copper-deep)] underline-offset-4 hover:underline"
              >
                <FileText aria-hidden="true" className="size-3.5" /> {labels.documents}
              </a>
            ) : null}
            {entry.externalUrl ? (
              <a
                href={entry.externalUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-[var(--copper-deep)] underline-offset-4 hover:underline"
              >
                <Link2 aria-hidden="true" className="size-3.5" /> {labels.publications}
              </a>
            ) : null}
          </CutoutCardFooter>
        ) : null}
      </CutoutCardContent>
    </CutoutCard>
  );
}
