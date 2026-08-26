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
import { Textarea } from "@/components/ui/textarea";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * Acceptation ou refus d'une proposition par le client.
 *
 * Accepter engage : la décision passe par une boîte de dialogue **et** une
 * case à cocher, jamais par un clic isolé au bout d'une ligne. Le serveur
 * revérifie tout — propriété du dossier, statut de la proposition,
 * confirmation — et refuse une seconde décision sur une proposition déjà
 * tranchée.
 */
export function ProposalDecision({
  dict,
  quoteId,
  proposalId,
}: {
  dict: Dictionary;
  quoteId: string;
  proposalId: string;
}) {
  const t = dict.platform.quotes;
  const router = useRouter();

  const [openAccept, setOpenAccept] = useState(false);
  const [openDecline, setOpenDecline] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function decide(decision: "accept" | "decline") {
    setBusy(true);
    setError("");

    const response = await fetch(`/api/client/quotes/${quoteId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, confirm: true, reason, proposalId }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : dict.platform.common.error);
      return;
    }

    setOpenAccept(false);
    setOpenDecline(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog
        open={openAccept}
        onOpenChange={(next) => {
          setOpenAccept(next);
          setConfirmed(false);
          setError("");
        }}
      >
        <DialogTrigger asChild>
          <Button type="button">{t.accept}</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.acceptTitle}</DialogTitle>
            <DialogDescription>{t.acceptBody}</DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-2">
            <input
              id="accept-confirm"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 size-4 shrink-0 rounded-sm border border-border accent-foreground"
            />
            <Label htmlFor="accept-confirm" className="text-sm font-normal leading-relaxed">
              {t.acceptCheckbox}
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
                {dict.platform.common.cancel}
              </Button>
            </DialogClose>
            <Button type="button" disabled={busy || !confirmed} onClick={() => decide("accept")}>
              {busy ? dict.platform.common.loading : t.accept}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDecline}
        onOpenChange={(next) => {
          setOpenDecline(next);
          setConfirmed(false);
          setError("");
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="secondary">
            {t.decline}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.declineTitle}</DialogTitle>
            <DialogDescription>{t.declineBody}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="decline-reason">{t.declineReason}</Label>
            <Textarea
              id="decline-reason"
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              id="decline-confirm"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 size-4 shrink-0 rounded-sm border border-border accent-foreground"
            />
            <Label htmlFor="decline-confirm" className="text-sm font-normal leading-relaxed">
              {t.declineTitle}
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
                {dict.platform.common.cancel}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || !confirmed}
              onClick={() => decide("decline")}
            >
              {busy ? dict.platform.common.loading : t.decline}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
