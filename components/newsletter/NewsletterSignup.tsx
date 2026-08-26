"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import type { SubscriberSource } from "@/lib/platform/enums";
import { cn } from "@/lib/utils";

type State = "idle" | "sending" | "done" | "already" | "error";

/**
 * Formulaire d'inscription à l'infolettre.
 *
 * Le même composant sert dans le pied de page, sur l'accueil, sur le blogue et
 * sur une fiche d'article : `source` change, le reste non. C'est cette source,
 * validée côté serveur, qui permet ensuite de savoir d'où viennent réellement
 * les abonnés.
 *
 * La case de consentement n'est jamais précochée : un consentement présumé
 * n'en est pas un.
 */
export function NewsletterSignup({
  dict,
  locale,
  source,
  variant = "block",
  className,
}: {
  dict: Dictionary;
  locale: Locale;
  source: SubscriberSource;
  /** `inline` : version compacte du pied de page. */
  variant?: "block" | "inline";
  className?: string;
}) {
  const t = dict.platform.newsletter;
  const fieldId = useId();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<State>("idle");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!consent) return;

    setState("sending");
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, firstName, consent: true, source, locale, website }),
      });

      if (!response.ok) {
        setState("error");
        return;
      }

      const payload = (await response.json().catch(() => null)) as { result?: string } | null;
      if (payload?.result === "already_active") {
        setState("already");
        return;
      }

      setState("done");
      setEmail("");
      setFirstName("");
      setConsent(false);
    } catch {
      setState("error");
    }
  }

  if (state === "done" || state === "already") {
    return (
      <p role="status" className={cn("text-sm text-muted-foreground", className)}>
        {state === "done" ? t.subscribed : t.alreadySubscribed}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={cn("grid gap-3", className)}>
      {variant === "block" ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`${fieldId}-first`}>{t.firstName}</Label>
          <Input
            id={`${fieldId}-first`}
            value={firstName}
            autoComplete="given-name"
            onChange={(event) => setFirstName(event.target.value)}
          />
        </div>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor={`${fieldId}-email`}>{dict.platform.auth.email}</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id={`${fieldId}-email`}
            type="email"
            required
            value={email}
            placeholder={t.placeholder}
            autoComplete="email"
            className="min-w-0 flex-1"
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" disabled={state === "sending" || !consent}>
            {state === "sending" ? dict.platform.common.sending : t.subscribe}
          </Button>
        </div>
      </div>

      {/* Piège à pourriel : jamais rempli par un visiteur, invisible et hors du parcours clavier. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
        <label htmlFor={`${fieldId}-website`}>Site web</label>
        <input
          id={`${fieldId}-website`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <div className="flex items-start gap-2">
        <input
          id={`${fieldId}-consent`}
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 size-4 shrink-0 rounded-sm border border-border accent-foreground"
        />
        <Label htmlFor={`${fieldId}-consent`} className="text-xs font-normal leading-relaxed text-muted-foreground">
          {t.consent} {t.consentHint}
        </Label>
      </div>

      {state === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {t.failed}
        </p>
      ) : null}
    </form>
  );
}
