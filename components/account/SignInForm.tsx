"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { FormButton, FormField, FormGroup, GlassForm } from "@/components/ruixen/glass-form";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * Connexion — un seul écran pour les clients et l'administration.
 *
 * Le rôle n'est jamais choisi ici : le serveur renvoie la session, et c'est
 * `destination` — calculé côté serveur à partir du rôle réel — qui décide où
 * atterrir. Un formulaire ne peut pas se déclarer administrateur.
 */
export function SignInForm({
  dict,
  forgotHref,
  registerHref,
  fallbackHref,
  nextPath,
  initialError,
}: {
  dict: Dictionary;
  forgotHref: string;
  registerHref: string;
  /** Destination employée si le serveur ne répond pas. */
  fallbackHref: string;
  /** Chemin demandé avant la redirection vers la connexion, déjà validé. */
  nextPath: string;
  initialError?: string;
}) {
  const t = dict.platform.auth;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe: true }),
      });

      if (!response.ok) {
        setError(t.signInFailed);
        setBusy(false);
        return;
      }

      // La destination dépend du rôle, que seul le serveur connaît.
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
          autoComplete="current-password"
        />
      </FormGroup>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <FormButton disabled={busy}>{busy ? dict.platform.common.loading : t.signIn}</FormButton>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <Link href={forgotHref} className="underline underline-offset-4">
          {t.forgot}
        </Link>
        <Link href={registerHref} className="underline underline-offset-4">
          {t.signUp}
        </Link>
      </div>
    </GlassForm>
  );
}
