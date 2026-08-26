"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ImageCardFan, type FanCardItem } from "@/components/ruixen/image-card-fan";

export type ProjectFanCard = FanCardItem & { href: string };

/**
 * Éventail des réalisations mises en avant.
 *
 * Le rendu et l'interaction — cartes en éventail, sélection au clic, au
 * clavier ou au glisser — sont ceux de Ruixen UI « Image Card Fan ». Ce
 * fichier ne fait que retenir la carte active pour offrir un lien vers le
 * projet correspondant : le composant d'origine n'en propose pas.
 */
export function ProjectFan({ cards, cta }: { cards: ProjectFanCard[]; cta: string }) {
  const [activeId, setActiveId] = React.useState(cards[0]?.id);
  const active = cards.find((card) => card.id === activeId) ?? cards[0];

  return (
    <div>
      <ImageCardFan
        cards={cards}
        activeId={active?.id}
        onSelect={(card) => setActiveId(card.id)}
        cardWidth={236}
      />

      {active ? (
        <p className="mt-6 text-center sm:text-right">
          <Link
            href={active.href}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--copper-deep)] underline-offset-4 transition-colors hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--copper)]"
          >
            {cta} — {active.title}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </p>
      ) : null}
    </div>
  );
}
