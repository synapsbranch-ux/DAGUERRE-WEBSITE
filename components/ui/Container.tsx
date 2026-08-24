import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Largeur et gouttières du site.
 *
 * Géométrie de la maquette : page de 1440 px avec 130 px de marge de chaque
 * côté, soit une colonne de contenu de 1180 px. En mobile (390 px), la marge
 * tombe à 20 px. Les paliers intermédiaires interpolent entre les deux.
 */
export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-[1440px] px-5 sm:px-10 lg:px-[130px]", className)}>
      {children}
    </div>
  );
}
