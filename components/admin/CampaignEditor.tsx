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
import { Textarea } from "@/components/ui/textarea";
import { campaignAudienceLabels, campaignAudiences } from "@/lib/platform/enums";

export type CampaignDraft = {
  id?: string;
  name: string;
  subject: string;
  previewText: string;
  content: string;
  locale: "fr" | "en";
  audienceType: string;
  /** Heure locale au format `datetime-local`, vide si aucun départ programmé. */
  scheduledAt: string;
  status: string;
};

/**
 * Éditeur de campagne.
 *
 * Le corps s'écrit en **Markdown**, comme tous les contenus longs du CMS : une
 * campagne n'a pas à imposer un second éditeur à apprendre. La syntaxe
 * supplémentaire se limite à `[[CTA:Libellé|url]]` pour un bouton d'appel à
 * l'action, faute d'équivalent en Markdown.
 *
 * Trois actions volontairement distinctes — enregistrer, prévisualiser,
 * envoyer un test — précèdent la seule qui soit irréversible.
 */
export function CampaignEditor({
  initial,
  sendable,
}: {
  initial: CampaignDraft;
  /** L'envoi réel n'est proposé que depuis la fiche d'une campagne existante. */
  sendable: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<CampaignDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");

  const editable = ["draft", "ready", "scheduled", "cancelled", "failed"].includes(draft.status);

  const set =
    <K extends keyof CampaignDraft>(key: K) =>
    (value: CampaignDraft[K]) =>
      setDraft((current) => ({ ...current, [key]: value }));

  const payload = () => ({
    name: draft.name,
    subject: draft.subject,
    previewText: draft.previewText,
    content: draft.content,
    locale: draft.locale,
    audienceType: draft.audienceType,
    /*
     * Le champ est saisi en heure locale (`datetime-local` n'a pas de fuseau).
     * On le convertit en instant absolu avant l'envoi : sans cela, une campagne
     * programmée à 9 h partirait à 9 h UTC, soit 4 h du matin à Montréal.
     */
    scheduledAt: draft.scheduledAt ? new Date(draft.scheduledAt).toISOString() : "",
  });

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");

    const endpoint = draft.id
      ? `/api/admin/newsletter/campaigns/${draft.id}`
      : "/api/admin/newsletter/campaigns";

    const response = await fetch(endpoint, {
      method: draft.id ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : "L'enregistrement a échoué.");
      return;
    }

    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    setMessage("Campagne enregistrée.");

    if (!draft.id && body?.id) {
      router.replace(`/admin/newsletter/campagnes/${body.id}`);
      return;
    }
    router.refresh();
  }

  async function showPreview() {
    setError("");
    const response = await fetch("/api/admin/newsletter/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload()),
    }).catch(() => null);

    if (!response?.ok) {
      setError("L'aperçu n'a pas pu être généré.");
      return;
    }

    const body = (await response.json()) as { html: string };
    setPreview(body.html);
  }

  async function sendTest() {
    if (!draft.id) return;
    setBusy(true);
    setError("");
    setMessage("");

    const response = await fetch(`/api/admin/newsletter/campaigns/${draft.id}/test`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: testEmail }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "L'envoi de test a échoué.");
      return;
    }
    setMessage(`Test envoyé à ${testEmail}.`);
  }

  return (
    <div className="mt-8 grid gap-6">
      <fieldset disabled={!editable} className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="campaign-name">Nom interne</Label>
          <Input
            id="campaign-name"
            value={draft.name}
            onChange={(event) => set("name")(event.target.value)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="campaign-locale">Langue</Label>
          <select
            id="campaign-locale"
            value={draft.locale}
            onChange={(event) => set("locale")(event.target.value === "en" ? "en" : "fr")}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </select>
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="campaign-subject">Objet du courriel</Label>
          <Input
            id="campaign-subject"
            value={draft.subject}
            onChange={(event) => set("subject")(event.target.value)}
          />
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="campaign-preview">Texte de prévisualisation</Label>
          <Input
            id="campaign-preview"
            value={draft.previewText}
            maxLength={200}
            onChange={(event) => set("previewText")(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Affiché à côté de l&apos;objet dans la liste des messages, jamais dans le corps.
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="campaign-audience">Audience</Label>
          <select
            id="campaign-audience"
            value={draft.audienceType}
            onChange={(event) => set("audienceType")(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            {campaignAudiences.map((value) => (
              <option key={value} value={value}>
                {campaignAudienceLabels[value].fr}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="campaign-schedule">Départ programmé</Label>
          <Input
            id="campaign-schedule"
            type="datetime-local"
            value={draft.scheduledAt}
            onChange={(event) => set("scheduledAt")(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Facultatif. Une date place la campagne en « Programmée » : le planificateur la lancera à
            l&apos;heure dite, sans intervention. Laissez vide pour lancer manuellement.
          </p>
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="campaign-content">Corps (Markdown)</Label>
          <Textarea
            id="campaign-content"
            rows={16}
            value={draft.content}
            onChange={(event) => set("content")(event.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Titres <code>#</code>, listes <code>-</code>, liens <code>[texte](url)</code>, images{" "}
            <code>![alt](url)</code>, bouton <code>[[CTA:Libellé|https://…]]</code>.
          </p>
        </div>
      </fieldset>

      {editable ? null : (
        <p role="status" className="rounded-lg border border-border bg-[var(--plate)] p-3 text-sm">
          Cette campagne est « {draft.status} » : son contenu n&apos;est plus modifiable.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {editable ? <Button onClick={save} disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button> : null}

        <Button type="button" variant="secondary" onClick={showPreview}>
          Prévisualiser
        </Button>

        {sendable && draft.id ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="secondary">
                Envoyer un test
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Envoyer un exemplaire de test</DialogTitle>
                <DialogDescription>
                  Le test n&apos;affecte ni le statut de la campagne ni ses statistiques.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-1.5">
                <Label htmlFor="test-email">Adresse de test</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(event) => setTestEmail(event.target.value)}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Annuler
                  </Button>
                </DialogClose>
                <Button type="button" onClick={sendTest} disabled={busy || !testEmail}>
                  Envoyer le test
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}

        {message ? (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      {preview ? (
        <section className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg">Aperçu</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(null)}>
              Fermer
            </Button>
          </div>
          {/* `sandbox` vide : l'aperçu ne peut ni exécuter de script ni naviguer. */}
          <iframe
            title="Aperçu du courriel"
            srcDoc={preview}
            sandbox=""
            className="mt-3 h-[600px] w-full rounded-md border border-border bg-white"
          />
        </section>
      ) : null}
    </div>
  );
}
