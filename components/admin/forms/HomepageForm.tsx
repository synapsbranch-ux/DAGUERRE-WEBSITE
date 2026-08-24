"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormSection } from "@/components/admin/forms/FormShell";
import { ImageField } from "@/components/admin/forms/ImageField";
import { LocalizedField, SwitchField } from "@/components/admin/forms/fields";
import { SingletonShell } from "@/components/admin/forms/SingletonShell";
import {
  emptyLocalized,
  readBoolean,
  readLocalized,
  readNumber,
  readString,
  type AdminDoc,
  type Localized,
} from "@/components/admin/forms/types";

/**
 * Composition de l'accueil.
 *
 * Chaque bande du site correspond à une `HomeSection` : l'ordre, la visibilité
 * et les textes d'en-tête se pilotent ici. Le contenu des listes (services,
 * compétences, projets et articles mis en avant) vient des collections
 * correspondantes — l'accueil ne duplique aucune donnée.
 */

type SectionValue = {
  _id?: string;
  key: string;
  order: number;
  visible: boolean;
  eyebrow: Localized;
  title: Localized;
  lead: Localized;
  image: string;
};

/** Bandes attendues par l'accueil, dans leur ordre par défaut. */
const knownSections: { key: string; label: string; description: string }[] = [
  { key: "hero", label: "Hero", description: "Portrait, titre et chiffres clés. Les textes viennent des Paramètres." },
  { key: "contact", label: "Bandeau de coordonnées", description: "Courriel, téléphone et ville, en bande fine." },
  { key: "data", label: "Des données aux décisions", description: "Démarche en cinq étapes, illustrée." },
  { key: "about", label: "À propos", description: "Portrait long et faits marquants, depuis le Profil." },
  { key: "projects", label: "Réalisations", description: "Projets mis en avant." },
  { key: "datakle", label: "Datakle", description: "Présentation et services publiés." },
  { key: "engagement", label: "Engagement", description: "Bande sombre, initiatives et valeurs." },
  { key: "blog", label: "Blogue", description: "Articles récents." },
  { key: "expertise", label: "Compétences", description: "Groupes de compétences actives." },
];

const labelOf = (key: string) => knownSections.find((entry) => entry.key === key)?.label ?? key;
const descriptionOf = (key: string) => knownSections.find((entry) => entry.key === key)?.description ?? "";

function read(doc: AdminDoc): SectionValue {
  return {
    _id: typeof doc._id === "string" ? doc._id : String(doc._id ?? ""),
    key: readString(doc.key),
    order: readNumber(doc.order) ?? 0,
    visible: readBoolean(doc.visible, true),
    eyebrow: readLocalized(doc.eyebrow),
    title: readLocalized(doc.title),
    lead: readLocalized(doc.lead),
    image: readString(doc.image),
  };
}

export function HomepageForm() {
  const router = useRouter();
  const [sections, setSections] = useState<SectionValue[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/homeSections")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("chargement"))))
      .then((data: AdminDoc[]) => {
        if (cancelled) return;
        const existing = data.map(read);
        const missing = knownSections
          .filter((known) => !existing.some((section) => section.key === known.key))
          .map((known, index) => ({
            key: known.key,
            order: existing.length + index,
            visible: true,
            eyebrow: emptyLocalized(),
            title: emptyLocalized(),
            lead: emptyLocalized(),
            image: "",
          }));
        setSections([...existing, ...missing].sort((a, b) => a.order - b.order));
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state !== "ready" || !sections) return <SingletonShell state={state === "error" ? "error" : "loading"} />;

  const update = (index: number, patch: Partial<SectionValue>) => {
    setSections((current) =>
      (current ?? []).map((section, position) => (position === index ? { ...section, ...patch } : section)),
    );
    setNotice("");
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (!sections[target]) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next.map((section, position) => ({ ...section, order: position })));
    setNotice("");
  };

  /**
   * Chaque bande est enregistrée séparément : une section déjà en base est
   * modifiée, une section manquante est créée. L'ordre enregistré est celui
   * affiché ici, réindexé pour rester contigu.
   */
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");

    const ordered = sections.map((section, index) => ({ ...section, order: index }));

    for (const section of ordered) {
      const payload = {
        key: section.key,
        order: section.order,
        visible: section.visible,
        eyebrow: section.eyebrow,
        title: section.title,
        lead: section.lead,
        image: section.image,
      };
      const response = section._id
        ? await fetch(`/api/admin/content/homeSections/${section._id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/homeSections", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!response.ok) {
        setSaving(false);
        setError(`La section « ${labelOf(section.key)} » n’a pas pu être enregistrée.`);
        return;
      }
    }

    setSaving(false);
    setSections(ordered);
    setNotice("Composition enregistrée. L’accueil est mis à jour.");
    router.refresh();
  };

  return (
    <form onSubmit={save} className="grid max-w-4xl gap-6 pb-24">
      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <FormSection
        title="Composition de l’accueil"
        description="Les textes du hero se règlent dans Paramètres ; ici, l’ordre, la visibilité et les en-têtes de chaque bande."
      >
        <ul className="grid gap-4">
          {sections.map((section, index) => (
            <li key={section.key} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-auto font-heading text-lg">
                  {labelOf(section.key)}
                  {section.visible ? null : (
                    <Badge variant="outline" className="ml-2">
                      masquée
                    </Badge>
                  )}
                </span>
                <Button type="button" variant="ghost" size="sm" aria-label="Monter" disabled={index === 0} onClick={() => move(index, -1)}>
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Descendre"
                  disabled={index === sections.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </Button>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">{descriptionOf(section.key)}</p>

              <div className="mt-3 grid gap-3">
                <SwitchField
                  label="Afficher cette section"
                  checked={section.visible}
                  onChange={(visible) => update(index, { visible })}
                />
                {section.key === "hero" ? null : (
                  <>
                    <LocalizedField
                      label="Surtitre"
                      value={section.eyebrow}
                      onChange={(eyebrow) => update(index, { eyebrow })}
                    />
                    <LocalizedField label="Titre" value={section.title} onChange={(title) => update(index, { title })} />
                    <LocalizedField
                      label="Accroche"
                      multiline
                      rows={3}
                      value={section.lead}
                      onChange={(lead) => update(index, { lead })}
                    />
                    <ImageField
                      label="Illustration"
                      value={section.image}
                      onChange={(image) => update(index, { image })}
                    />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </FormSection>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-1 py-4 backdrop-blur">
        <Button disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer la composition"}</Button>
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {notice}
        </p>
      </div>
    </form>
  );
}
