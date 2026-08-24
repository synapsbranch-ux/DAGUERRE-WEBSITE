/** Types partagés par les formulaires du tableau de bord. */

export type Localized = { fr: string; en: string };

export type ContentStatus = "draft" | "published" | "archived";

export const statusOptions: readonly { value: ContentStatus; label: string }[] = [
  { value: "draft", label: "Brouillon — invisible sur le site" },
  { value: "published", label: "Publié — visible sur le site" },
  { value: "archived", label: "Archivé — retiré du site, conservé ici" },
];

/** Document brut renvoyé par l'API d'administration. */
export type AdminDoc = Record<string, unknown>;

export const emptyLocalized = (): Localized => ({ fr: "", en: "" });

/** Lit un champ bilingue quel que soit son état en base (absent, chaîne, objet). */
export function readLocalized(value: unknown): Localized {
  if (typeof value === "string") return { fr: value, en: "" };
  if (typeof value === "object" && value) {
    const record = value as { fr?: unknown; en?: unknown };
    return {
      fr: typeof record.fr === "string" ? record.fr : "",
      en: typeof record.en === "string" ? record.en : "",
    };
  }
  return emptyLocalized();
}

export function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function readList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function readStatus(value: unknown): ContentStatus {
  return value === "published" || value === "archived" ? value : "draft";
}

/** Date ISO complète → valeur d'un `<input type="datetime-local">`. */
export function readDateTimeLocal(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Valeur d'un `<input type="datetime-local">` → ISO, ou chaîne vide. */
export function toIsoDate(value: string): string {
  if (!value.trim()) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** Lit un tableau d'objets en repassant chaque entrée par un lecteur dédié. */
export function readArray<T>(value: unknown, read: (entry: AdminDoc) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is AdminDoc => typeof entry === "object" && entry !== null)
    .map(read);
}
