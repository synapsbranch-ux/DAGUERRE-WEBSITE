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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Ouverture d'un projet à partir d'un devis accepté.
 *
 * Un projet ouvert est visible du client et porte ses documents : la
 * conversion est donc un geste explicite, jamais un effet de bord de
 * l'acceptation. Le serveur refuse d'en créer un second pour le même dossier.
 */
export function ConvertToProject({
  quoteId,
  quoteNumber,
  title,
}: {
  quoteId: string;
  quoteNumber: string;
  title: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState(title);
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function convert() {
    setBusy(true);
    setError("");

    const response = await fetch(`/api/admin/quotes/${quoteId}/convert`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: projectTitle, startDate, targetDate, status: "planned" }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "La conversion a échoué.");
      return;
    }

    const body = (await response.json()) as { id: string };
    setOpen(false);
    router.push(`/admin/projets-clients/${body.id}`);
    router.refresh();
  }

  return (
    <section className="grid gap-3 rounded-lg border border-border p-5">
      <h2 className="font-heading text-lg">Projet</h2>
      <p className="text-sm text-muted-foreground">
        Le devis {quoteNumber} est accepté. Ouvrez le projet pour y déposer les documents et publier
        l&apos;avancement.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" className="w-fit">
            Ouvrir le projet
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ouvrir un projet ?</DialogTitle>
            <DialogDescription>
              Le client en sera informé et le retrouvera dans son espace. Un seul projet peut être ouvert
              par dossier.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="project-title">Titre</Label>
              <Input
                id="project-title"
                value={projectTitle}
                onChange={(event) => setProjectTitle(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="project-start">Début</Label>
                <Input
                  id="project-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="project-target">Échéance</Label>
                <Input
                  id="project-target"
                  type="date"
                  value={targetDate}
                  onChange={(event) => setTargetDate(event.target.value)}
                />
              </div>
            </div>
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
            <Button type="button" onClick={convert} disabled={busy || !projectTitle.trim()}>
              {busy ? "Création…" : "Ouvrir le projet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
