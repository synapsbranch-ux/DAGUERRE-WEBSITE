
import { locales } from "@/lib/i18n";

/**
 * Champ texte traduisible.
 *
 * Le français est requis (c'est la langue de référence du site), l'anglais est
 * facultatif : le tableau de bord peut publier une fiche avant sa traduction,
 * et l'affichage retombe alors sur le français.
 */
export type LocalizedString = {
  fr: string;
  en?: string;
};

export function localizedString(required = false) {
  return {
    fr: { type: String, required, trim: true, default: "" },
    en: { type: String, trim: true, default: "" },
  };
}

/** Résout un champ traduisible pour une locale donnée, avec repli sur le FR. */
export function pickLocale(
  value: LocalizedString | undefined,
  locale: (typeof locales)[number],
): string {
  if (!value) return "";
  const candidate = locale === "fr" ? value.fr : value.en;
  return candidate?.trim() ? candidate : (value.fr ?? "");
}

/** États de publication communs aux contenus éditoriaux. */
export const statusValues = ["draft", "published", "archived"] as const;
export type Status = (typeof statusValues)[number];

export const statusField = {
  type: String,
  enum: statusValues,
  default: "draft" as Status,
  index: true,
};

/**
 * Options communes : `timestamps` pour `createdAt` / `updatedAt`, et
 * suppression de `__v` qui n'apporte rien ici.
 */
export const schemaOptions: { timestamps: true; versionKey: false } = {
  timestamps: true,
  versionKey: false,
};
