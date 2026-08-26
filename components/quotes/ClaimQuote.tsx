"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * Rattachement d'une demande anonyme au compte connecté.
 *
 * Le geste est explicite plutôt qu'automatique : ouvrir un lien ne doit pas
 * lier silencieusement un dossier à la première session trouvée. Le serveur
 * revérifie que l'adresse du compte est bien celle de la demande.
 */
export function ClaimQuote({
  dict,
  token,
  trackHrefBase,
}: {
  dict: Dictionary;
  token: string;
  trackHrefBase: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function claim() {
    setBusy(true);
    setError("");

    const response = await fetch("/api/quotes/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || dict.platform.common.error);
      setBusy(false);
      return;
    }

    const body = (await response.json()) as { id: string };
    router.replace(`${trackHrefBase}/${body.id}`);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <Button onClick={claim} disabled={busy} className="w-fit">
        {busy ? dict.platform.common.loading : dict.platform.quotes.successTrack}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
