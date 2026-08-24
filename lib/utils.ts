import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Construit un slug d'URL à partir d'un titre.
 *
 * Les accents sont décomposés puis retirés (`é` → `e`) pour que « Réalisations
 * 2024 » donne `realisations-2024` : le slug reste lisible et stable, alors
 * qu'un caractère accentué serait percent-encodé dans l'URL.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "")
}

/** Date lisible en français, pour les listes du tableau de bord. */
export function formatDate(value: unknown): string {
  const date =
    value instanceof Date ? value : typeof value === "string" || typeof value === "number" ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium" }).format(date)
}
