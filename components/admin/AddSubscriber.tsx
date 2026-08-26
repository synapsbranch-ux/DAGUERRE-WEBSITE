"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Ajout manuel d'un abonné.
 *
 * Replié par défaut : c'est une opération rare, elle ne doit pas occuper la
 * place de la liste. Le formulaire rappelle explicitement que l'administrateur
 * atteste d'un consentement recueilli ailleurs — inscrire quelqu'un qui ne l'a
 * pas demandé reste une faute, que l'interface le permette ou non.
 */
export function AddSubscriber() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [locale, setLocale] = useState("fr");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/newsletter/subscribers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, firstName, lastName, locale, status: "active" }),
    }).catch(() => null);

    setBusy(false);

    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error || "L'ajout a échoué.");
      return;
    }

    setEmail("");
    setFirstName("");
    setLastName("");
    setMessage("Abonné ajouté.");
    router.refresh();
  }

  if (!open) {
    return (
      <div className="mt-6">
        <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Ajouter un abonné
        </Button>
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-lg">Ajouter un abonné</h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Fermer
        </Button>
      </div>

      <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
        À n&apos;utiliser que pour une inscription recueillie hors ligne. La source enregistrée sera
        « saisie manuelle », et l&apos;ajout est journalisé.
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="add-email">Courriel</Label>
          <Input
            id="add-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="add-first">Prénom</Label>
          <Input id="add-first" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="add-last">Nom</Label>
          <Input id="add-last" value={lastName} onChange={(event) => setLastName(event.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="add-locale">Langue</Label>
          <select
            id="add-locale"
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </select>
        </div>

        <div className="flex items-center gap-3 sm:col-span-2">
          <Button disabled={busy || !email}>{busy ? "Ajout…" : "Ajouter"}</Button>
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
      </form>
    </section>
  );
}
