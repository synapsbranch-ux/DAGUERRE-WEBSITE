"use client";

import * as React from "react";

import { ChapterScrubber, type Chapter } from "@/components/ruixen/chapter-scrubber";

type ChapterRailProps = {
  chapters: Chapter[];
  label: string;
};

/**
 * Rail de chapitres — Ruixen UI « Chapter Scrubber ».
 *
 * Une graduation verticale : le survol ou le focus grossit la marque et
 * ouvre la fiche du chapitre ; la sélection fait défiler jusqu'à la section
 * correspondante. Le composant gère l'aimantation, le clavier et l'inversion
 * de côté près du bord.
 *
 * Le rail est un raccourci, jamais le seul chemin : les sections restent
 * lisibles et atteignables sans lui. Il est donc masqué sous `lg`, où le
 * pointeur est grossier et la fiche de survol sans objet.
 */
export function ChapterRail({ chapters, label }: ChapterRailProps) {
  const scrollTo = React.useCallback((chapter: Chapter) => {
    const target = document.getElementById(chapter.id);
    if (!target) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, []);

  if (chapters.length < 2) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block">
      <div className="pointer-events-auto">
        <ChapterScrubber
          chapters={chapters}
          side="left"
          label={label}
          onSelect={scrollTo}
        />
      </div>
    </div>
  );
}
