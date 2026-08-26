import { slugify } from "@/lib/utils";

export type MarkdownHeading = { id: string; title: string };

/**
 * Titres de niveau 2 (`## …`) extraits d'un corps Markdown, pour alimenter
 * une table des matières.
 *
 * Volontairement simple : seuls les titres en texte brut sont reconnus (pas
 * de gras, lien ou code imbriqué). C'est la même règle qui doit être
 * appliquée par le composant Markdown pour que les ancres correspondent —
 * voir `components/sections/ArticleMarkdown.tsx`.
 */
export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const seen = new Map<string, number>();

  return markdown
    .split("\n")
    .filter((line) => /^##\s+\S/.test(line))
    .map((line) => {
      const title = line.replace(/^##\s+/, "").trim();
      const base = slugify(title) || "section";
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      return { id: count === 0 ? base : `${base}-${count}`, title };
    });
}
