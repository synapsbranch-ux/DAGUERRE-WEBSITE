"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Ruixen UI — Accordion Editorial.
 *
 * Adaptations Daguerre : le contenu d'un panneau accepte n'importe quel nœud
 * (un chapô suivi de son lien de lecture), un intitulé secondaire peut
 * accompagner le titre, et le jeu de démonstration est retiré — la bande ne
 * s'affiche que si elle a de vrais articles à présenter.
 */

export interface AccordionEditorialItem {
  id: string;
  title: string;
  /** Ligne discrète posée en regard du titre — date, durée de lecture. */
  meta?: string;
  content: React.ReactNode;
}

export interface AccordionEditorialProps {
  items: AccordionEditorialItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  collapsible?: boolean;
  className?: string;
}

export default function AccordionEditorial({
  items,
  defaultValue,
  value,
  onValueChange,
  collapsible = true,
  className,
}: AccordionEditorialProps) {
  return (
    <div className={cn("w-full", className)}>
      <Accordion
        type="single"
        defaultValue={value ? undefined : defaultValue}
        value={value}
        onValueChange={onValueChange}
        collapsible={collapsible}
      >
        {items.map((item) => (
          <AccordionItem
            value={item.id}
            key={item.id}
            className="group/item border-none"
          >
            <AccordionTrigger className="cursor-pointer gap-6 py-4 hover:no-underline [&>svg]:hidden">
              <span className="font-heading text-xl tracking-[-0.02em] text-foreground/35 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/item:translate-x-px group-hover/item:text-foreground/60 group-data-[state=open]/item:text-foreground sm:text-2xl">
                {item.title}
              </span>
              {item.meta ? (
                <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {item.meta}
                </span>
              ) : null}
            </AccordionTrigger>
            <AccordionContent>
              <div className="border-l border-border pb-1 pl-4 text-sm leading-[1.8] text-muted-foreground">
                {item.content}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
