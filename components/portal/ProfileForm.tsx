"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Dictionary } from "@/lib/dictionaries";
import type { ClientProfile } from "@/lib/platform/client";

/**
 * Profil client — complété progressivement.
 *
 * Aucun champ n'est obligatoire : le formulaire sert à accélérer les futures
 * demandes de devis, pas à filtrer l'accès. La préférence d'infolettre est
 * enregistrée par un appel distinct, sur une ressource distincte : elle
 * relève du consentement marketing, pas des données du compte.
 */
export function ProfileForm({
  dict,
  profile,
  subscribed,
}: {
  dict: Dictionary;
  profile: ClientProfile;
  subscribed: boolean;
}) {
  const t = dict.platform.profile;
  const common = dict.platform.common;
  const router = useRouter();

  const [values, setValues] = useState(profile);
  const [marketing, setMarketing] = useState(subscribed);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const set = (key: keyof ClientProfile) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("saving");
    setMessage("");

    try {
      const response = await fetch("/api/client/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          companyName: values.companyName,
          jobTitle: values.jobTitle,
          phone: values.phone,
          country: values.country,
          preferredLanguage: values.preferredLanguage,
          industry: values.industry,
          companySize: values.companySize,
          website: values.website,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
        setMessage(typeof payload?.error === "string" ? payload.error : common.error);
        setState("error");
        return;
      }

      setState("saved");
      router.refresh();
    } catch {
      setMessage(common.networkError);
      setState("error");
    }
  }

  async function toggleMarketing(next: boolean) {
    setMarketing(next);
    const response = await fetch("/api/client/newsletter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscribed: next }),
    }).catch(() => null);

    // La bascule reflète l'état réel : en cas d'échec, elle revient en arrière
    // plutôt que d'afficher un abonnement qui n'existe pas.
    if (!response?.ok) setMarketing(!next);
  }

  const field = (
    key: keyof ClientProfile,
    label: string,
    type: string = "text",
    autoComplete?: string,
  ) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`profile-${key}`}>{label}</Label>
      <Input
        id={`profile-${key}`}
        type={type}
        autoComplete={autoComplete}
        value={String(values[key] ?? "")}
        onChange={(event) => set(key)(event.target.value)}
      />
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-8">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-heading text-lg">{t.identity}</legend>
        {field("firstName", t.firstName, "text", "given-name")}
        {field("lastName", t.lastName, "text", "family-name")}
        {field("phone", t.phone, "tel", "tel")}
        {field("country", t.country, "text", "country-name")}
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-heading text-lg">{t.company}</legend>
        {field("companyName", t.companyName, "text", "organization")}
        {field("jobTitle", t.jobTitle, "text", "organization-title")}
        {field("industry", t.industry)}
        {field("companySize", t.companySize)}
        <div className="sm:col-span-2">{field("website", t.website, "url", "url")}</div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 font-heading text-lg">{t.preferences}</legend>

        <div className="grid max-w-xs gap-1.5">
          <Label htmlFor="profile-language">{t.language}</Label>
          <Select
            value={values.preferredLanguage}
            onValueChange={(value) =>
              setValues((current) => ({ ...current, preferredLanguage: value === "en" ? "en" : "fr" }))
            }
          >
            <SelectTrigger id="profile-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border p-4">
          <Switch
            id="profile-marketing"
            checked={marketing}
            onCheckedChange={toggleMarketing}
            aria-describedby="profile-marketing-hint"
          />
          <div className="grid gap-1">
            <Label htmlFor="profile-marketing">{t.marketingLabel}</Label>
            <p id="profile-marketing-hint" className="text-xs text-muted-foreground">
              {t.marketingHint}
            </p>
          </div>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={state === "saving"}>
          {state === "saving" ? dict.platform.common.saving : dict.platform.common.save}
        </Button>
        {state === "saved" ? (
          <p role="status" className="text-sm text-muted-foreground">
            {dict.platform.common.saved}
          </p>
        ) : null}
        {state === "error" ? (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
