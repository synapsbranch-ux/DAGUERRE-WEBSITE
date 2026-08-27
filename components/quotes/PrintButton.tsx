"use client";

import { Button } from "@/components/ui/button";

/**
 * Ouvre la boîte d'impression du navigateur.
 *
 * `window.print()` a besoin d'un composant client ; c'est tout ce que
 * celui-ci contient, pour que la page d'impression reste rendue côté serveur.
 */
export function PrintButton({ label, className }: { label: string; className?: string }) {
  return (
    <Button type="button" variant="secondary" className={className} onClick={() => window.print()}>
      {label}
    </Button>
  );
}
