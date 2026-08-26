/**
 * Sécurité du rendu de texte fourni par un tiers.
 *
 * Les messages d'un client, les descriptions d'une demande de devis et les
 * corps d'infolettre sont écrits par des humains, pas par le code. Ils sont
 * donc traités comme du **texte**, jamais comme du balisage : tout part par
 * `escapeHtml()`, et seules les constructions explicitement reconnues
 * ensuite (lien, gras, titre) redeviennent des balises.
 *
 * Faire l'inverse — filtrer les balises dangereuses d'un HTML accepté tel
 * quel — revient à courir après une liste noire qu'on n'arrive jamais à
 * fermer.
 */

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ENTITIES[char] ?? char);
}

/**
 * URL sûre pour un attribut `href`.
 *
 * Seuls `http:`, `https:` et `mailto:` sont acceptés. `javascript:` et
 * `data:` sont écartés : ce sont eux qui transforment un lien en exécution de
 * script dans un client de messagerie permissif.
 */
export function safeHref(value: string): string | null {
  const trimmed = value.trim().replace(/&amp;/g, "&");
  if (/^https?:\/\/[^\s<>"']+$/i.test(trimmed)) return trimmed;
  if (/^mailto:[^\s<>"']+$/i.test(trimmed)) return trimmed;
  if (/^\/[^/\\][^\s<>"']*$/.test(trimmed)) return trimmed;
  return null;
}

/** Texte brut rendu en paragraphes HTML, sauts de ligne préservés. */
export function textToParagraphs(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

/** Version courte d'un texte, pour un aperçu de liste. */
export function excerptOf(value: string, length = 160): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length <= length ? flat : `${flat.slice(0, length - 1)}…`;
}
