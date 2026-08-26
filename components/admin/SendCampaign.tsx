"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

/**
 * Lancement d'une campagne.
 *
 * Envoyer une infolettre est irréversible : ni rappel, ni correctif. La boîte
 * de dialogue affiche donc, avant tout, **ce qui va réellement partir** —
 * campagne, audience, nombre exact de destinataires compté en base à
 * l'ouverture — et exige une case cochée.
 *
 * Cette action n'existe pas dans la liste des campagnes : un bouton « Envoyer »
 * au bout d'une ligne de tableau, c'est un envoi accidentel qui attend son
 * heure.
 */
export function SendCampaign({
  campaignId,
  campaignName,
  audienceLabel,
  audienceType,
  disabledReason,
}: {
  campaignId: string;
  campaignName: string;
  audienceLabel: string;
  audienceType: string;
  /** Raison rendant l'envoi impossible ; le bouton reste alors désactivé. */
  disabledReason?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadCount(next: boolean) {
    setOpen(next);
    if (!next) return;

    setCount(null);
    setConfirmed(false);
    setError("");

    const response = await fetch(
      `/api/admin/newsletter/audience?type=${encodeURIComponent(audienceType)}`,
      { cache: "no-store" },
    ).catch(() => null);

    if (!response?.ok) {
      setError("Le nombre de destinataires n'a pas pu être calculé.");
      return;
    }
    const body = (await response.json()) as { count: number };
    setCount(body.count);
  }

  async function send() {
    setBusy(true);
    setError("");

    const response = await fetch(`/api/admin/newsletter/campaigns/${campaignId}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "L'envoi n'a pas pu être lancé.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (disabledReason) {
    return (
      <Button type="button" disabled title={disabledReason}>
        Envoyer l&apos;infolettre
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={loadCount}>
      <DialogTrigger asChild>
        <Button type="button">Envoyer l&apos;infolettre</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envoyer cette campagne ?</DialogTitle>
          <DialogDescription>
            L&apos;envoi est immédiat et irréversible. Vérifiez le contenu avec l&apos;aperçu et un
            courriel de test avant de confirmer.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-2 rounded-lg border border-border p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Campagne</dt>
            <dd className="text-right font-medium">{campaignName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Audience</dt>
            <dd className="text-right font-medium">{audienceLabel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Destinataires</dt>
            <dd className="text-right font-medium">
              {count === null ? "Calcul…" : count.toLocaleString("fr-CA")}
            </dd>
          </div>
        </dl>

        <div className="flex items-start gap-2">
          <input
            id="send-confirm"
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1 size-4 shrink-0 rounded-sm border border-border accent-foreground"
          />
          <Label htmlFor="send-confirm" className="text-sm font-normal leading-relaxed">
            Je confirme l&apos;envoi de cette campagne à cette audience.
          </Label>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Annuler
            </Button>
          </DialogClose>
          <Button type="button" onClick={send} disabled={busy || !confirmed || count === null || count === 0}>
            {busy ? "Lancement…" : "Envoyer l'infolettre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
