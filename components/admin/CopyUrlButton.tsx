"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Copie une URL de média dans le presse-papiers, avec confirmation visible. */
export function CopyUrlButton({ url, size }: { url: string; size?: "sm" }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      disabled={!url}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Presse-papiers refusé (contexte non sécurisé) : l'URL reste
          // sélectionnable à la main dans le champ voisin.
          setCopied(false);
        }
      }}
    >
      <span aria-live="polite">{copied ? "Copié" : "Copier l’URL"}</span>
    </Button>
  );
}
