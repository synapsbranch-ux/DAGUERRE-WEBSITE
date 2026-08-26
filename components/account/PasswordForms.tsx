"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { FormButton, FormField, FormGroup, GlassForm } from "@/components/ruixen/glass-form";
import type { Dictionary } from "@/lib/dictionaries";

/**
 * Demande de réinitialisation.
 *
 * La réponse est **toujours** la même, qu'un compte existe ou non : afficher
 * « adresse inconnue » transformerait ce formulaire en outil d'énumération des
 * comptes clients.
 */
export function ForgotPasswordForm({
  dict,
  redirectTo,
  signInHref,
}: {
  dict: Dictionary;
  /** URL absolue de la page de choix du nouveau mot de passe. */
  redirectTo: string;
  signInHref: string;
}) {
  const t = dict.platform.auth;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, redirectTo }),
    }).catch(() => null);
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full max-w-[380px] rounded-lg border border-border p-6">
        <p role="status" className="text-sm leading-relaxed">
          {t.forgotSent}
        </p>
        <Link
          href={signInHref}
          className="mt-5 inline-block text-sm font-medium underline underline-offset-4"
        >
          {t.signIn}
        </Link>
      </div>
    );
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
      </FormGroup>
      <FormButton disabled={busy}>{busy ? dict.platform.common.sending : t.forgotSubmit}</FormButton>
    </GlassForm>
  );
}

/**
 * Choix du nouveau mot de passe.
 *
 * Le jeton arrive dans l'URL après validation par Better Auth. Il n'est jamais
 * conservé ailleurs que dans la requête d'envoi : ni état persistant, ni
 * stockage local.
 */
export function ResetPasswordForm({
  dict,
  signInHref,
}: {
  dict: Dictionary;
  signInHref: string;
}) {
  const t = dict.platform.auth;
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-[380px] rounded-lg border border-destructive/40 bg-destructive/10 p-6">
        <p role="alert" className="text-sm text-destructive">
          {t.resetInvalid}
        </p>
        <Link
          href={signInHref}
          className="mt-5 inline-block text-sm font-medium underline underline-offset-4"
        >
          {t.signIn}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-[380px] rounded-lg border border-border p-6">
        <p role="status" className="text-sm">
          {t.resetDone}
        </p>
        <Link
          href={signInHref}
          className="mt-5 inline-block text-sm font-medium underline underline-offset-4"
        >
          {t.signIn}
        </Link>
      </div>
    );
  }

  async function submit() {
    if (password !== confirm) {
      setError(t.passwordMismatch);
      return;
    }
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newPassword: password, token }),
      });
      if (!response.ok) {
        setError(t.resetInvalid);
        setBusy(false);
        return;
      }
      setDone(true);
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

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <FormButton disabled={busy}>{busy ? dict.platform.common.saving : t.resetSubmit}</FormButton>
    </GlassForm>
  );
}
