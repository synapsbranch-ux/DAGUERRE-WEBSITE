"use client";

import { useState } from "react";

import { LiquidButton } from "@liquefy-ui/react";
import {
  FormField,
  FormGroup,
  FormSegment,
  FormTextArea,
  GlassForm,
} from "@/components/ruixen/glass-form";
import type { Dictionary } from "@/lib/dictionaries";

type ContactFormProps = {
  dict: Dictionary;
};

type Subject = "mandat" | "emploi" | "autre";

type FormState = {
  name: string;
  organisation: string;
  email: string;
  subject: Subject;
  message: string;
  /** Piège à pourriel : un visiteur ne le remplit jamais. */
  website: string;
};

const initialState: FormState = {
  name: "",
  organisation: "",
  email: "",
  subject: "mandat",
  message: "",
  website: "",
};

/**
 * Formulaire de contact — Ruixen UI « Glass Form » pour les champs, bouton
 * d'envoi en verre liquide Liquefy.
 *
 * `Glass Form` est entièrement contrôlé (pas d'attribut `name`, donc pas de
 * `FormData` native) : l'état de chaque champ vit ici, et c'est cet état —
 * pas une lecture du DOM — qui construit le message envoyé à `/api/contact`.
 * La validation (`required`, `type="email"`), le piège à pourriel caché et
 * les quatre états (repos, envoi, envoyé, erreur) sont ceux du formulaire
 * d'origine, seule la présentation change.
 */
export function ContactForm({ dict }: ContactFormProps) {
  const page = dict.pages.contact;
  const [values, setValues] = useState<FormState>(initialState);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const subjects: { value: Subject; label: string }[] = [
    { value: "mandat", label: page.subjectMandate },
    { value: "emploi", label: page.subjectJob },
    { value: "autre", label: page.subjectOther },
  ];

  const set = <K extends keyof FormState>(key: K) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value as FormState[K] }));

  async function handleSubmit() {
    setState("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      if (response.ok) {
        setState("sent");
        setValues(initialState);
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  return (
    <GlassForm onSubmit={handleSubmit} style={{ maxWidth: "none" }}>
      {/* Piège à pourriel : masqué visuellement, hors du tabulateur, jamais rempli par une personne. */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => set("website")(event.target.value)}
        />
      </div>

      <FormGroup>
        <FormField
          label={page.name}
          value={values.name}
          onChange={set("name")}
          required
          autoComplete="name"
        />
        <FormField
          label={page.organisation}
          value={values.organisation}
          onChange={set("organisation")}
          placeholder={page.optional}
          autoComplete="organization"
        />
        <FormField
          label={page.email}
          type="email"
          value={values.email}
          onChange={set("email")}
          required
          autoComplete="email"
        />
      </FormGroup>

      <FormGroup>
        <FormSegment
          label={page.subject}
          options={subjects}
          value={values.subject}
          onChange={(value) => set("subject")(value)}
        />
      </FormGroup>

      <FormGroup>
        <FormTextArea
          label={page.message}
          value={values.message}
          onChange={set("message")}
          placeholder={page.messagePlaceholder}
          rows={6}
          required
        />
      </FormGroup>

      {state === "sent" ? (
        <p role="status" className="text-sm text-[var(--brass-deep)]">
          {page.sent}
        </p>
      ) : null}
      {state === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {page.error}
        </p>
      ) : null}

      <LiquidButton type="submit" isLoading={state === "sending"} style={{ width: "100%" }}>
        {page.send}
      </LiquidButton>
    </GlassForm>
  );
}
