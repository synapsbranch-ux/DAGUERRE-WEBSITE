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

/**
 * Action destructive confirmée.
 *
 * Le libellé et la description sont fournis par l'appelant : « Archiver » et
 * « Supprimer définitivement » n'ont pas les mêmes conséquences et ne doivent
 * jamais se ressembler dans l'interface.
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  endpoint,
  redirectTo,
  method = "DELETE",
  body,
  variant = "destructive",
  size,
}: {
  trigger: string;
  title: string;
  description: string;
  confirmLabel: string;
  endpoint: string;
  /** Destination après succès ; sans elle, la page est simplement rafraîchie. */
  redirectTo?: string;
  method?: "DELETE" | "PATCH";
  body?: unknown;
  variant?: "destructive" | "secondary" | "ghost";
  size?: "sm";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method,
        ...(body === undefined
          ? {}
          : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
        setError(typeof payload?.error === "string" ? payload.error : "L’opération a échoué.");
        setBusy(false);
        return;
      }
      setOpen(false);
      if (redirectTo) router.replace(redirectTo);
      router.refresh();
    } catch {
      setError("Le serveur est injoignable.");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={variant} size={size}>
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
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
          <Button type="button" variant="destructive" disabled={busy} onClick={run}>
            {busy ? "En cours…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
