"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Ruixen UI — Automated Tasks Panel.
 *
 * Adaptations Daguerre :
 * - la liste, l'en-tête et les étiquettes viennent des props (la version
 *   d'origine embarquait une démonstration « AI payroll ») ;
 * - les gris codés en dur laissent place aux jetons de la charte ;
 * - le carré gris de chaque ligne devient son numéro d'étape ;
 * - la boucle s'arrête sous `prefers-reduced-motion`, où la liste défile
 *   alors normalement au doigt ou à la molette.
 *
 * La composition — carte défilante à gauche, propos à droite — et le
 * défilement continu sont ceux du composant d'origine.
 */

export interface AutomatedTask {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export interface AutomatedTasksPanelProps {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  tasks: AutomatedTask[];
  tags?: string[];
  /** Durée d'un tour complet, en secondes. */
  duration?: number;
  className?: string;
}

export default function AutomatedTasksPanel({
  eyebrow,
  title,
  lead,
  tasks,
  tags = [],
  duration = 22,
  className,
}: AutomatedTasksPanelProps) {
  const reduced = useReducedMotion();

  return (
    <section className={cn("relative w-full", className)}>
      <div className="mx-auto grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-14">
        {/* Gauche — la chaîne de traitement, en boucle. */}
        <div className="relative w-full">
          <Card className="overflow-hidden rounded-lg border-border bg-[var(--surface)] py-0 shadow-[var(--shadow-plate)]">
            <CardContent className="relative h-[340px] overflow-hidden p-0">
              <div className="relative h-full overflow-hidden">
                <motion.ul
                  className="absolute flex w-full flex-col"
                  animate={reduced ? undefined : { y: ["0%", "-50%"] }}
                  transition={{
                    repeat: Infinity,
                    repeatType: "loop",
                    duration,
                    ease: "linear",
                  }}
                >
                  {[...tasks, ...tasks].map((task, index) => (
                    <li
                      key={`${task.title}-${index}`}
                      aria-hidden={index >= tasks.length ? "true" : undefined}
                      className="flex items-center gap-3 border-b border-border px-4 py-3.5"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-[var(--copper-wash)] font-mono text-xs font-bold text-[var(--copper-deep)]">
                        {String((index % tasks.length) + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-heading text-sm font-semibold text-foreground">
                          {task.title}
                        </span>
                        {task.subtitle ? (
                          <span className="block text-xs leading-5 text-muted-foreground">
                            {task.subtitle}
                          </span>
                        ) : null}
                      </span>
                      {task.icon ? (
                        <span className="shrink-0 text-[var(--copper-deep)]">{task.icon}</span>
                      ) : null}
                    </li>
                  ))}
                </motion.ul>

                {/* Dégradés de bord — le défilement se perd dans la carte. */}
                <div className="pointer-events-none absolute left-0 top-0 h-12 w-full bg-gradient-to-b from-[var(--surface)] via-[var(--surface)]/70 to-transparent" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-12 w-full bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/70 to-transparent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Droite — le propos. */}
        <div className="space-y-6">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2 className="font-heading text-[clamp(1.7rem,3vw,2.6rem)] leading-[1.08] tracking-[-0.03em]">
            {title}
          </h2>
          {lead ? (
            <p className="max-w-[52ch] text-[15px] leading-7 text-muted-foreground">{lead}</p>
          ) : null}

          {tags.length > 0 ? (
            <ul className="flex flex-wrap gap-2.5">
              {tags.map((tag) => (
                <li key={tag}>
                  <Badge variant="secondary" className="px-3.5 py-1.5 text-[13px]">
                    {tag}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
