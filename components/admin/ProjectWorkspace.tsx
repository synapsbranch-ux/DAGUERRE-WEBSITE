"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FileUpload } from "@/components/admin/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clientProjectStatusLabels, clientProjectStatuses } from "@/lib/platform/enums";

export type ProjectForm = {
  title: string;
  description: string;
  status: string;
  startDate: string;
  targetDate: string;
  completedAt: string;
};

/**
 * Pilotage d'un projet.
 *
 * Deux gestes distincts : modifier la fiche, et publier un point
 * d'avancement. Le second est **destiné au client** — il déclenche
 * notification et courriel — et ne doit donc jamais partir par effet de bord
 * d'un simple enregistrement de dates.
 */
export function ProjectWorkspace({
  projectId,
  clientId,
  initial,
}: {
  projectId: string;
  clientId: string;
  initial: ProjectForm;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateBody, setUpdateBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const set =
    <K extends keyof ProjectForm>(key: K) =>
    (value: ProjectForm[K]) =>
      setForm((current) => ({ ...current, [key]: value }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");

    const response = await fetch(`/api/admin/projects/${projectId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      setError("L'enregistrement a échoué.");
      return;
    }

    setNotice("Projet enregistré. Le client n'a pas été notifié.");
    router.refresh();
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");

    const response = await fetch(`/api/admin/projects/${projectId}/updates`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: updateTitle, body: updateBody }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      setError("La publication a échoué.");
      return;
    }

    setUpdateTitle("");
    setUpdateBody("");
    setNotice("Avancement publié. Le client a été prévenu.");
    router.refresh();
  }

  return (
    <div className="grid gap-8">
      <form onSubmit={save} className="grid gap-4 rounded-lg border border-border p-5">
        <h2 className="font-heading text-lg">Fiche du projet</h2>

        <div className="grid gap-1.5">
          <Label htmlFor="project-title">Titre</Label>
          <Input
            id="project-title"
            value={form.title}
            onChange={(event) => set("title")(event.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="project-description">Description</Label>
          <Textarea
            id="project-description"
            rows={4}
            value={form.description}
            onChange={(event) => set("description")(event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="grid gap-1.5">
            <Label htmlFor="project-status">État</Label>
            <select
              id="project-status"
              value={form.status}
              onChange={(event) => set("status")(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              {clientProjectStatuses.map((value) => (
                <option key={value} value={value}>
                  {clientProjectStatusLabels[value].fr}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="project-start">Début</Label>
            <Input
              id="project-start"
              type="date"
              value={form.startDate}
              onChange={(event) => set("startDate")(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="project-target">Échéance</Label>
            <Input
              id="project-target"
              type="date"
              value={form.targetDate}
              onChange={(event) => set("targetDate")(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="project-completed">Terminé le</Label>
            <Input
              id="project-completed"
              type="date"
              value={form.completedAt}
              onChange={(event) => set("completedAt")(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
          {notice ? (
            <p role="status" className="text-sm text-muted-foreground">
              {notice}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </form>

      <form onSubmit={publish} className="grid gap-4 rounded-lg border border-border p-5">
        <div>
          <h2 className="font-heading text-lg">Publier un avancement</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Visible immédiatement par le client, avec notification et courriel.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="update-title">Titre</Label>
          <Input
            id="update-title"
            value={updateTitle}
            onChange={(event) => setUpdateTitle(event.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="update-body">Détail</Label>
          <Textarea
            id="update-body"
            rows={4}
            value={updateBody}
            onChange={(event) => setUpdateBody(event.target.value)}
          />
        </div>

        <Button disabled={busy || !updateTitle.trim()} className="w-fit">
          Publier
        </Button>
      </form>

      <section className="grid gap-4 rounded-lg border border-border p-5">
        <h2 className="font-heading text-lg">Déposer un document</h2>
        <FileUpload
          label="Document du projet"
          hint="Portée « projet précis » : visible du client de ce projet, et de personne d'autre."
          visibility="specific_project"
          ownerUserId={clientId}
          projectId={projectId}
          onUploaded={() => router.refresh()}
        />
      </section>
    </div>
  );
}
