"use client";

import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Localized } from "@/components/admin/forms/types";

/**
 * Briques de formulaire du tableau de bord.
 *
 * Chaque champ porte son propre `<Label>` associé par `id`, affiche l'erreur
 * Zod qui le concerne et se signale par `aria-invalid` / `aria-describedby`.
 * Les formulaires métier n'ont donc plus qu'à décrire *quels* champs ils
 * exposent — jamais comment les rendre accessibles.
 */

export type FieldErrors = Record<string, string[] | undefined>;

/** Erreur portant sur `name`, ou sur l'une de ses sous-clés (`slug.fr`). */
export function errorFor(errors: FieldErrors | undefined, ...names: string[]): string | undefined {
  if (!errors) return undefined;
  for (const name of names) {
    const direct = errors[name];
    if (direct?.length) return direct[0];
  }
  return undefined;
}

type FieldShellProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

function FieldShell({ label, htmlFor, hint, error, required, className, children }: FieldShellProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive" aria-hidden="true">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Identifiants dérivés d'un `useId` : le champ, son aide et son erreur. */
function useFieldIds(error?: string, hint?: string) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");
  return { id, describedBy: describedBy || undefined };
}

type BaseProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
};

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  required,
  className,
  type = "text",
  placeholder,
  maxLength,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const { id, describedBy } = useFieldIds(error, hint);
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} error={error} required={required} className={className}>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldShell>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  error,
  min,
  max,
  className,
}: BaseProps & {
  /** `null` représente « non renseigné » — distinct de zéro. */
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
}) {
  const { id, describedBy } = useFieldIds(error, hint);
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} error={error} className={className}>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value === null ? "" : String(value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const raw = event.target.value.trim();
          onChange(raw === "" ? null : Number(raw));
        }}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  hint,
  error,
  rows = 4,
  required,
  className,
  maxLength,
}: BaseProps & {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
}) {
  const { id, describedBy } = useFieldIds(error, hint);
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} error={error} required={required} className={className}>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldShell>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  error,
  className,
}: BaseProps & {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  const { id, describedBy } = useFieldIds(error, hint);
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} error={error} className={className}>
      <select
        id={id}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function SwitchField({
  label,
  checked,
  onChange,
  hint,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3 py-1", className)}>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <div className="grid gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

/**
 * Champ bilingue.
 *
 * Le français est la langue d'édition de référence : il est toujours visible.
 * L'anglais se déplie à la demande et reste facultatif — l'affichage public
 * retombe sur le français quand la traduction est vide, ce que le champ
 * annonce explicitement.
 */
export function LocalizedField({
  label,
  value,
  onChange,
  hint,
  errorFr,
  errorEn,
  required,
  multiline,
  rows = 4,
  className,
}: {
  label: string;
  value: Localized;
  onChange: (value: Localized) => void;
  hint?: string;
  errorFr?: string;
  errorEn?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
}) {
  const [showEnglish, setShowEnglish] = useState(() => Boolean(value.en));
  const frId = useId();
  const enId = `${frId}-en`;

  const Control = multiline ? Textarea : Input;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={frId}>
          {label}
          {required ? <span className="text-destructive" aria-hidden="true">*</span> : null}
          <Badge variant="outline" className="ml-1">FR</Badge>
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={showEnglish}
          aria-controls={enId}
          onClick={() => setShowEnglish((open) => !open)}
        >
          {showEnglish ? "Masquer l’anglais" : "Ajouter l’anglais"}
        </Button>
      </div>

      <Control
        id={frId}
        rows={multiline ? rows : undefined}
        value={value.fr}
        aria-invalid={errorFr ? true : undefined}
        onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          onChange({ ...value, fr: event.target.value })
        }
      />
      {errorFr ? (
        <p role="alert" className="text-xs text-destructive">
          {errorFr}
        </p>
      ) : null}

      {showEnglish ? (
        <div className="mt-1 grid gap-1.5" id={enId}>
          <Label htmlFor={`${enId}-input`} className="text-muted-foreground">
            {label}
            <Badge variant="outline" className="ml-1">EN</Badge>
          </Label>
          <Control
            id={`${enId}-input`}
            rows={multiline ? rows : undefined}
            value={value.en ?? ""}
            aria-invalid={errorEn ? true : undefined}
            onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              onChange({ ...value, en: event.target.value })
            }
          />
          <p className="text-xs text-muted-foreground">
            Facultatif : laissé vide, le site anglais affiche le texte français.
          </p>
        </div>
      ) : null}

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Champ Markdown : même saisie qu'un texte long, avec le rappel du format. */
export function MarkdownField({
  label,
  value,
  onChange,
  error,
  className,
}: {
  label: string;
  value: Localized;
  onChange: (value: Localized) => void;
  error?: string;
  className?: string;
}) {
  return (
    <LocalizedField
      label={label}
      value={value}
      onChange={onChange}
      errorFr={error}
      multiline
      rows={14}
      className={className}
      hint={`Markdown : **gras**, _italique_, ## titres, - listes, [lien](https://…). ${value.fr.trim().split(/\s+/).filter(Boolean).length} mots. Le HTML brut n’est pas rendu.`}
    />
  );
}

/**
 * Liste de valeurs courtes (tags, technologies, livrables…).
 *
 * La saisie se fait par jetons : Entrée ou virgule valide la valeur courante.
 * Un champ texte séparé par des virgules obligerait à deviner l'échappement
 * dès qu'une valeur contient elle-même une virgule.
 */
export function ListField({
  label,
  values,
  onChange,
  hint,
  error,
  placeholder,
  className,
}: BaseProps & {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const { id, describedBy } = useFieldIds(error, hint);

  const commit = (raw: string) => {
    const entries = raw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && !values.includes(entry));
    if (entries.length) onChange([...values, ...entries]);
    setDraft("");
  };

  return (
    <FieldShell label={label} htmlFor={id} hint={hint} error={error} className={className}>
      {values.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((entry) => (
            <li key={entry}>
              <span className="inline-flex items-center gap-1 rounded-sm border border-border py-0.5 pr-1 pl-2 text-sm">
                {entry}
                <button
                  type="button"
                  aria-label={`Retirer ${entry}`}
                  className="rounded-sm px-1 text-muted-foreground hover:bg-foreground/7 hover:text-foreground"
                  onClick={() => onChange(values.filter((item) => item !== entry))}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        id={id}
        value={draft}
        placeholder={placeholder ?? "Saisir puis Entrée"}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const next = event.target.value;
          if (next.endsWith(",")) commit(next);
          else setDraft(next);
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
          }
          if (event.key === "Backspace" && draft === "" && values.length) {
            onChange(values.slice(0, -1));
          }
        }}
      />
    </FieldShell>
  );
}

/**
 * Tableau d'objets éditable : frise, sections, expériences, statistiques.
 *
 * Le rendu d'une ligne est délégué à l'appelant, ce qui laisse chaque
 * formulaire nommer ses propres champs plutôt que d'exposer un éditeur JSON.
 */
export function RepeaterField<T>({
  label,
  hint,
  items,
  onChange,
  create,
  renderItem,
  addLabel = "Ajouter",
  itemLabel,
  max,
}: {
  label: string;
  hint?: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode;
  addLabel?: string;
  itemLabel?: (item: T, index: number) => string;
  max?: number;
}) {
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <fieldset className="grid gap-3 rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      {hint ? <p className="-mt-1 text-xs text-muted-foreground">{hint}</p> : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune entrée pour le moment.</p>
      ) : null}

      {items.map((item, index) => (
        <div key={index} className="grid gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {itemLabel?.(item, index) ?? `Entrée ${index + 1}`}
            </span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" aria-label="Monter" disabled={index === 0} onClick={() => move(index, -1)}>
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Descendre"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Retirer cette entrée"
                onClick={() => onChange(items.filter((_, position) => position !== index))}
              >
                Retirer
              </Button>
            </div>
          </div>
          {renderItem(
            item,
            (patch) => onChange(items.map((current, position) => (position === index ? { ...current, ...patch } : current))),
            index,
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        className="w-fit"
        disabled={max !== undefined && items.length >= max}
        onClick={() => onChange([...items, create()])}
      >
        {addLabel}
      </Button>
    </fieldset>
  );
}
