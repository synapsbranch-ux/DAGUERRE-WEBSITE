import { Section } from "@/components/ui/Section";

export type SectionSpec = {
  id: string;
  title: string;
  description?: string;
};

type SectionOutlineProps = {
  /**
   * Soit une liste explicite, soit le bloc `sections` d'un dictionnaire
   * (`{ identifiant: "Titre" }`) — la clé sert alors d'ancre.
   */
  sections: SectionSpec[] | Record<string, string>;
  emptyLabel: string;
};

function normalize(sections: SectionOutlineProps["sections"]): SectionSpec[] {
  return Array.isArray(sections)
    ? sections
    : Object.entries(sections).map(([id, title]) => ({ id, title }));
}

/**
 * Rend la trame d'une page : une `<section>` ancrée par entrée, prête à
 * recevoir son contenu. Remplacer progressivement par des composants dédiés.
 */
export function SectionOutline({ sections, emptyLabel }: SectionOutlineProps) {
  return (
    <div className="divide-y divide-border">
      {normalize(sections).map((section) => (
        <Section
          key={section.id}
          id={section.id}
          title={section.title}
          description={section.description}
        >
          <p className="text-sm text-muted-foreground/60">{emptyLabel}</p>
        </Section>
      ))}
    </div>
  );
}
