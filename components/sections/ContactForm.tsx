"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Dictionary } from "@/lib/dictionaries";

type ContactFormProps = {
  dict: Dictionary;
};

/**
 * Formulaire de contact, repris de la maquette : bloc encadré d'un filet,
 * champs sur deux colonnes, contrôle segmenté pour l'objet.
 *
 * Le contrôle segmenté est en CSS pur (`has-[:checked]`), comme dans la
 * maquette : des `<input type="radio">` masqués, l'état visuel porté par le
 * `<label>`. Aucun JavaScript, donc le composant reste côté serveur.
 *
 * L'action d'envoi est branchée en même temps que la collection des messages.
 */
export function ContactForm({ dict }: ContactFormProps) {
  const page = dict.pages.contact;
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const subjects = [
    { value: "mandat", label: page.subjectMandate },
    { value: "emploi", label: page.subjectJob },
    { value: "autre", label: page.subjectOther },
  ];

  return (
    <form className="flex h-fit flex-col gap-4 rounded-md border border-border p-7" onSubmit={async (event) => { event.preventDefault(); setState("sending"); const form = new FormData(event.currentTarget); const response = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); setState(response.ok ? "sent" : "error"); if (response.ok) event.currentTarget.reset(); }}>
      <div className="hidden" aria-hidden="true"><Label htmlFor="website">Website</Label><Input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="name">{page.name}</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="organisation">{page.organisation}</Label>
          <Input id="organisation" name="organisation" placeholder={page.optional} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="email">{page.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-xs text-muted-foreground">{page.subject}</legend>
        <div className="flex overflow-hidden rounded-md border border-border">
          {subjects.map((subject, index) => (
            <label
              key={subject.value}
              className={`flex flex-1 cursor-pointer items-center justify-center py-2 text-sm transition-colors has-[:checked]:text-primary has-[:checked]:shadow-[inset_0_0_0_1px_var(--primary)] not-has-[:checked]:hover:bg-foreground/7 ${
                index > 0 ? "border-l border-border" : ""
              }`}
            >
              <input
                type="radio"
                name="subject"
                value={subject.value}
                defaultChecked={index === 0}
                className="sr-only"
              />
              {subject.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-1.5">
        <Label htmlFor="message">{page.message}</Label>
        <Textarea
          id="message"
          name="message"
          rows={6}
          placeholder={page.messagePlaceholder}
          required
        />
      </div>

      {state === "sent" ? <p role="status" className="text-sm text-[var(--brass-deep)]">{page.sent}</p> : null}
      {state === "error" ? <p role="alert" className="text-sm text-destructive">{page.error}</p> : null}
      <Button type="submit" size="block" disabled={state === "sending"} className="mt-1">
        {state === "sending" ? "…" : page.send}
      </Button>
    </form>
  );
}
