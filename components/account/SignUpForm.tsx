"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  FormButton,
  FormField,
  FormGroup,
  FormToggle,
  GlassForm,
} from "@/components/ruixen/glass-form";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";

/**
 * Inscription client.
 *
 * Deux points de conception :
 *
 * - **Aucun rôle n'est envoyé.** Le serveur attribue `client` ; le champ n'est
 *   pas exposé à l'entrée de Better Auth.
 * - **L'infolettre est un geste distinct.** La case est décochée par défaut et
 *   déclenche, seulement si elle est cochée, une inscription séparée avec son
 *   propre consentement horodaté. Créer un compte n'abonne personne.
 */
export function SignUpForm({
  dict,
  locale,
  signInHref,
  fallbackHref,
  nextPath,
}: {
  dict: Dictionary;
  locale: Locale;
  signInHref: string;
  fallbackHref: string;
  nextPath: string;
}) {
  const t = dict.platform.auth;
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password !== confirm) {
      setError(t.passwordMismatch);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name || email, email, password }),
      });

      if (!response.ok) {
        setError(t.signUpFailed);
        setBusy(false);
        return;
      }

      if (newsletter) {
        // Échec silencieux volontaire : le compte est créé, l'abonnement se
        // rattrape depuis le profil. Bloquer l'inscription ici serait absurde.
        await fetch("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email,
            firstName: name.split(" ")[0] ?? "",
            consent: true,
            source: "client_portal",
            locale,
          }),
        }).catch(() => null);
      }

      const query = nextPath ? `?suivant=${encodeURIComponent(nextPath)}` : "";
      const landing = await fetch(`/api/account/landing${query}`, { cache: "no-store" })
        .then((res) => (res.ok ? (res.json() as Promise<{ href: string }>) : null))
        .catch(() => null);

      router.replace(landing?.href ?? fallbackHref);
      router.refresh();
    } catch {
      setError(dict.platform.common.networkError);
      setBusy(false);
    }
  }

  return (
    <GlassForm onSubmit={submit} sound={false}>
      <FormGroup>
        <FormField label={t.name} value={name} onChange={setName} autoComplete="name" />
        <FormField
          label={t.email}
          type="email"
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
        />
        <FormField
          label={t.password}
          type="password"
          value={password}
          onChange={setPassword}
          required
          autoComplete="new-password"
        />
        <FormField
          label={t.confirmPassword}
          type="password"
          value={confirm}
          onChange={setConfirm}
          required
          autoComplete="new-password"
        />
      </FormGroup>

      <p className="text-xs text-muted-foreground">{t.passwordHint}</p>

      <FormGroup>
        <FormToggle
          label={t.marketingOptIn}
          description={t.marketingHint}
          checked={newsletter}
          onChange={setNewsletter}
        />
      </FormGroup>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <FormButton disabled={busy}>{busy ? dict.platform.common.loading : t.signUp}</FormButton>

      <p className="text-sm text-muted-foreground">
        {t.hasAccount}{" "}
        <Link href={signInHref} className="font-medium text-foreground underline underline-offset-4">
          {t.signIn}
        </Link>
      </p>
    </GlassForm>
  );
}
