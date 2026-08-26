"use client";

import * as React from "react";

import { MagneticTabs, type MagneticTabItem } from "@/components/ruixen/magnetic-tabs";
import { TagCloudSelect, type TagCloudOption } from "@/components/ruixen/tag-cloud-select";
import { Badge } from "@/components/ui/badge";
import type { SkillGroup } from "@/lib/types";

type SkillsExplorerProps = {
  groups: SkillGroup[];
  labels: { explore: string; explorePlaceholder: string; categories: string };
};

/**
 * Compétences — Ruixen UI « Magnetic Tabs » + « Tag Cloud Select ».
 *
 * Les onglets répartissent les groupes par catégorie. Le nuage de mots
 * au-dessus laisse choisir des compétences précises : la sélection réduit
 * les onglets aux seuls groupes qui les contiennent, plutôt que de rester
 * un contrôle décoratif sans effet sur la page.
 *
 * Aucun pourcentage ni note de maîtrise nulle part : seules les compétences
 * « à l'avant » (`featured`) reçoivent une pastille plus grande dans le
 * nuage — un signal relatif, pas un chiffre inventé.
 */
export function SkillsExplorer({ groups, labels }: SkillsExplorerProps) {
  const [selected, setSelected] = React.useState<string[]>([]);

  const options: TagCloudOption[] = React.useMemo(() => {
    const byName = new Map<string, boolean>();
    for (const group of groups) {
      for (const skill of group.skills) {
        byName.set(skill.name, byName.get(skill.name) || skill.featured);
      }
    }
    return Array.from(byName.entries()).map(([name, featured]) => ({
      value: name,
      label: name,
      popularity: featured ? 88 : 46,
    }));
  }, [groups]);

  const visibleGroups =
    selected.length === 0
      ? groups
      : groups.filter((group) => group.skills.some((skill) => selected.includes(skill.name)));

  const tabs: MagneticTabItem[] = visibleGroups.map((group) => ({
    value: group.slug,
    label: group.name,
    content: (
      <div id={group.slug} className="scroll-mt-24">
        {group.description ? (
          <p className="mb-4 max-w-[62ch] text-sm leading-6 text-muted-foreground">{group.description}</p>
        ) : null}
        <ul className="flex flex-wrap gap-2">
          {group.skills.map((skill) => (
            <li key={skill.name}>
              <Badge
                variant={
                  selected.length > 0 && !selected.includes(skill.name)
                    ? "outline"
                    : skill.featured
                      ? "secondary"
                      : "outline"
                }
                className={selected.includes(skill.name) ? "border-primary" : undefined}
              >
                {skill.name}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    ),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm font-semibold text-foreground">{labels.explore}</p>
        <TagCloudSelect
          options={options}
          placeholder={labels.explorePlaceholder}
          onChange={setSelected}
          triggerClassName="w-full sm:w-[280px]"
        />
      </div>

      <div className="mt-8">
        {tabs.length > 0 ? (
          // Remonté quand la sélection change l'ensemble des onglets visibles :
          // le composant est non contrôlé, `defaultValue` ne s'applique qu'au montage.
          <MagneticTabs
            key={visibleGroups.map((group) => group.slug).join("|")}
            items={tabs}
            defaultValue={tabs[0]?.value}
          />
        ) : null}
      </div>
    </div>
  );
}
