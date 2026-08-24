"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { slugify } from "@/lib/utils";
import type { Localized } from "@/components/admin/forms/types";

/**
 * Slug simple, non traduit — compétences et autres identifiants techniques.
 *
 * Même logique que `SlugField` : suggéré depuis le nom, figé dès la première
 * édition manuelle.
 */
export function PlainSlugField({
  value,
  onChange,
  auto,
  onAutoChange,
  source,
  error,
  label = "Slug",
  hint,
}: {
  value: string;
  onChange: (value: string) => void;
  auto: boolean;
  onAutoChange: (auto: boolean) => void;
  /** Texte dont dérive la suggestion. */
  source: string;
  error?: string;
  label?: string;
  hint?: string;
}) {
  const id = useId();
  const suggestion = slugify(source);

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>
          {label}
          <span className="text-destructive" aria-hidden="true">*</span>
          <Badge variant={auto ? "secondary" : "outline"}>{auto ? "auto" : "manuel"}</Badge>
        </Label>
        {!auto && suggestion && suggestion !== value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onAutoChange(true);
              onChange(suggestion);
            }}
          >
            Régénérer
          </Button>
        ) : null}
      </div>
      <Input
        id={id}
        value={value}
        placeholder={suggestion || "identifiant"}
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          onAutoChange(false);
          onChange(slugify(event.target.value));
        }}
      />
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Slug d'URL, déduit du titre mais modifiable.
 *
 * Tant que l'auteur n'a pas touché au champ, le slug suit le titre français.
 * Dès la première édition manuelle, il se fige : renommer un titre après
 * publication ne doit pas casser silencieusement une URL déjà partagée.
 */
export function SlugField({
  value,
  onChange,
  auto,
  onAutoChange,
  title,
  errorFr,
  errorEn,
}: {
  value: Localized;
  onChange: (value: Localized) => void;
  auto: boolean;
  onAutoChange: (auto: boolean) => void;
  /** Titre français, source de la génération automatique. */
  title: string;
  errorFr?: string;
  errorEn?: string;
}) {
  const id = useId();
  const suggestion = slugify(title);

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>
          Slug (URL)
          <span className="text-destructive" aria-hidden="true">*</span>
          <Badge variant={auto ? "secondary" : "outline"}>{auto ? "auto" : "manuel"}</Badge>
        </Label>
        {!auto && suggestion && suggestion !== value.fr ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onAutoChange(true);
              onChange({ ...value, fr: suggestion });
            }}
          >
            Régénérer depuis le titre
          </Button>
        ) : null}
      </div>

      <Input
        id={id}
        value={value.fr}
        aria-invalid={errorFr ? true : undefined}
        placeholder={suggestion || "mon-contenu"}
        onChange={(event) => {
          onAutoChange(false);
          onChange({ ...value, fr: slugify(event.target.value) });
        }}
      />
      {errorFr ? (
        <p role="alert" className="text-xs text-destructive">
          {errorFr}
        </p>
      ) : null}

      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-en`} className="text-muted-foreground">
          Slug anglais
          <Badge variant="outline">EN</Badge>
        </Label>
        <Input
          id={`${id}-en`}
          value={value.en}
          aria-invalid={errorEn ? true : undefined}
          placeholder="facultatif"
          onChange={(event) => onChange({ ...value, en: slugify(event.target.value) })}
        />
        {errorEn ? (
          <p role="alert" className="text-xs text-destructive">
            {errorEn}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Facultatif : sans slug anglais, l’URL anglaise réutilise le slug français.
          </p>
        )}
      </div>
    </div>
  );
}
