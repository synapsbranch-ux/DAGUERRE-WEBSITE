"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FileUpload } from "@/components/admin/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ContractSignerDraft = { name: string; email: string; role: string; order: string };

export type ContractDraft = {
  id?: string;
  title: string;
  source: "generated" | "uploaded";
  body: string;
  sourceFileId: string;
  sourceFileName: string;
  clientId: string;
  message: string;
  locale: "fr" | "en";
  expiresAt: string;
  signers: ContractSignerDraft[];
  status: string;
};

const EMPTY_SIGNER: ContractSignerDraft = { name: "", email: "", role: "", order: "0" };

/**
 * Rédaction d'un contrat.
 *
 * Deux origines, exclusives : un texte rédigé ici, ou un PDF déposé. Le
 * formulaire ne propose jamais les deux à la fois — un contrat n'a qu'un
 * contenu, et laisser coexister les deux champs inviterait à envoyer l'un en
 * croyant avoir envoyé l'autre.
 *
 * L'ordre de signature se saisit par un rang : `0` laisse chacun signer quand
 * il veut, un rang non nul impose d'attendre les précédents. C'est le serveur
 * qui fait respecter cet ordre au moment de signer ; ce champ ne fait que le
 * déclarer.
 */
export function ContractEditor({ initial }: { initial: ContractDraft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<ContractDraft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const editable = draft.status === "draft";

  const set = <K extends keyof ContractDraft>(key: K, value: ContractDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const setSigner = (index: number, patch: Partial<ContractSignerDraft>) =>
    setDraft((current) => ({
      ...current,
      signers: current.signers.map((signer, i) => (i === index ? { ...signer, ...patch } : signer)),
    }));

  async function save() {
    setBusy(true);
    setError("");
    setMessage("");

    const payload = {
      title: draft.title,
      source: draft.source,
      body: draft.source === "generated" ? draft.body : "",
      sourceFileId: draft.source === "uploaded" ? draft.sourceFileId : "",
      clientId: draft.clientId,
      message: draft.message,
      locale: draft.locale,
      expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : "",
      signers: draft.signers
        .filter((signer) => signer.email.trim())
        .map((signer) => ({
          name: signer.name,
          email: signer.email,
          role: signer.role,
          order: Number(signer.order) || 0,
        })),
    };

    const response = await fetch(
      draft.id ? `/api/admin/contracts/${draft.id}` : "/api/admin/contracts",
      {
        method: draft.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    ).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const body = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof body?.error === "string" ? body.error : "L'enregistrement a échoué.");
      return;
    }

    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    if (!draft.id && body?.id) {
      router.replace(`/admin/contrats/${body.id}`);
      return;
    }
    setMessage("Contrat enregistré.");
    router.refresh();
  }

  if (!editable) {
    return (
      <p className="rounded-lg border border-border bg-[var(--plate)] p-4 text-sm text-muted-foreground">
        Ce contrat est parti en signature : son empreinte est figée et des parties l&apos;ont peut-être
        déjà lu. Le modifier produirait un document signé différent de celui qui a été présenté. Pour
        corriger, annulez-le et repartez d&apos;un nouveau contrat.
      </p>
    );
  }

  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="contract-title">Titre</Label>
          <Input
            id="contract-title"
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Entente de services — refonte du site"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor="contract-source">Origine</Label>
            <select
              id="contract-source"
              value={draft.source}
              onChange={(event) => set("source", event.target.value === "uploaded" ? "uploaded" : "generated")}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="generated">Rédigé ici</option>
              <option value="uploaded">PDF déposé</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="contract-locale">Langue</Label>
            <select
              id="contract-locale"
              value={draft.locale}
              onChange={(event) => set("locale", event.target.value === "en" ? "en" : "fr")}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="contract-expires">Expire le</Label>
            <Input
              id="contract-expires"
              type="date"
              value={draft.expiresAt}
              onChange={(event) => set("expiresAt", event.target.value)}
            />
          </div>
        </div>
      </section>

      {draft.source === "generated" ? (
        <section className="grid gap-1.5">
          <Label htmlFor="contract-body">Texte du contrat</Label>
          <p className="text-xs text-muted-foreground">
            Texte brut à paragraphes. Une ligne commençant par <code>#</code> devient un titre ; rien
            d&apos;autre n&apos;est interprété — un document qui engage juridiquement n&apos;a pas à
            contenir de lien ni d&apos;image.
          </p>
          <Textarea
            id="contract-body"
            rows={20}
            value={draft.body}
            onChange={(event) => set("body", event.target.value)}
            className="font-mono text-xs"
          />
        </section>
      ) : (
        <section className="grid gap-3">
          <Label>Document à faire signer</Label>
          {draft.sourceFileId ? (
            <p className="text-sm text-muted-foreground">
              Déposé : <span className="font-medium text-foreground">{draft.sourceFileName || "document.pdf"}</span>{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setDraft((current) => ({ ...current, sourceFileId: "", sourceFileName: "" }))}
              >
                Remplacer
              </button>
            </p>
          ) : (
            <FileUpload
              label="PDF du contrat"
              hint="Le document est repris tel quel : les signatures et la piste d'audit sont ajoutées en pages supplémentaires, sans toucher à votre mise en page."
              visibility="admin_only"
              onUploaded={(file) =>
                setDraft((current) => ({
                  ...current,
                  sourceFileId: file.id,
                  sourceFileName: file.filename,
                }))
              }
            />
          )}
        </section>
      )}

      <section className="grid gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-lg">Signataires</h2>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setDraft((current) => ({ ...current, signers: [...current.signers, { ...EMPTY_SIGNER }] }))}
          >
            Ajouter
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Chaque partie reçoit un lien personnel. Le rang <code>0</code> laisse signer dans
          n&apos;importe quel ordre ; un rang non nul impose d&apos;attendre les rangs inférieurs.
        </p>

        <ul className="grid gap-4">
          {draft.signers.map((signer, index) => (
            <li key={index} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_1fr_1fr_80px_auto]">
              <div className="grid gap-1.5">
                <Label htmlFor={`signer-name-${index}`}>Nom</Label>
                <Input
                  id={`signer-name-${index}`}
                  value={signer.name}
                  onChange={(event) => setSigner(index, { name: event.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`signer-email-${index}`}>Courriel</Label>
                <Input
                  id={`signer-email-${index}`}
                  type="email"
                  value={signer.email}
                  onChange={(event) => setSigner(index, { email: event.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`signer-role-${index}`}>Qualité</Label>
                <Input
                  id={`signer-role-${index}`}
                  value={signer.role}
                  onChange={(event) => setSigner(index, { role: event.target.value })}
                  placeholder="Cliente"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`signer-order-${index}`}>Rang</Label>
                <Input
                  id={`signer-order-${index}`}
                  type="number"
                  min={0}
                  max={20}
                  value={signer.order}
                  onChange={(event) => setSigner(index, { order: event.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={draft.signers.length <= 1}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      signers: current.signers.filter((_, i) => i !== index),
                    }))
                  }
                >
                  Retirer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-1.5">
        <Label htmlFor="contract-message">Message d&apos;accompagnement</Label>
        <Textarea
          id="contract-message"
          rows={3}
          value={draft.message}
          onChange={(event) => set("message", event.target.value)}
          placeholder="Voici l'entente pour signature. N'hésitez pas à me joindre pour toute question."
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" disabled={busy || !draft.title.trim()} onClick={save}>
          {busy ? "Enregistrement…" : draft.id ? "Enregistrer" : "Créer le brouillon"}
        </Button>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}
