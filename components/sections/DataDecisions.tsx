import { Check } from "lucide-react";

import AutomatedTasksPanel from "@/components/ruixen/automated-tasks-panel";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { HomeSection } from "@/lib/types";

/**
 * Accueil — de la donnée à la décision.
 *
 * Ruixen UI « Automated Tasks Panel » : la carte de gauche fait défiler la
 * chaîne de traitement en boucle — donnée brute, nettoyage, structuration,
 * modélisation, analyse, décision — pendant que la colonne de droite porte
 * le propos. La boucle s'arrête sous `prefers-reduced-motion`.
 *
 * Les textes d'en-tête sont surchargeables depuis le CMS (`HomeSection`) ;
 * les étapes viennent du dictionnaire, traduit dans les deux langues.
 */
export function DataDecisions({ dict, section: cms }: { dict: Dictionary; section?: HomeSection }) {
  const section = dict.home.dataDecisions;

  return (
    <section className="overflow-hidden py-[var(--band-space)]">
      <Container>
        <AutomatedTasksPanel
          eyebrow={cms?.eyebrow || section.eyebrow}
          title={cms?.title || section.title}
          lead={cms?.lead || section.lead}
          tasks={section.pipeline.map((step) => ({ title: step.label, subtitle: step.detail }))}
          tags={section.steps.map((step) => step.label)}
        />

        <p className="mt-10 flex max-w-[58ch] items-start gap-3 text-sm font-semibold leading-6 text-[var(--navy-800)]">
          <Check className="mt-0.5 size-5 shrink-0 text-[var(--copper-deep)]" aria-hidden="true" />
          {section.result}
        </p>
      </Container>
    </section>
  );
}
