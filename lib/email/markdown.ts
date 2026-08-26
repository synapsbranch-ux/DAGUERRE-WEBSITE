import type { EmailBlock } from "@/lib/email/layout";
import { escapeHtml, safeHref } from "@/lib/platform/sanitize";

/**
 * Markdown → blocs de courriel.
 *
 * Le CMS écrit déjà ses contenus longs en Markdown : les campagnes gardent la
 * même syntaxe plutôt que d'imposer un second éditeur à apprendre.
 *
 * ## Ordre des opérations
 *
 * Le texte est **échappé d'abord**, formaté ensuite. Un corps de campagne
 * contenant `<script>` produit donc `&lt;script&gt;` — du texte visible, pas
 * une balise. Aucune portion de la saisie ne devient du HTML sans être passée
 * par une construction Markdown explicitement reconnue ici.
 *
 * ## Constructions prises en charge
 *
 * - `# titre`, `## titre` → titre de section
 * - paragraphes, `**gras**`, `*italique*`, `[texte](url)`
 * - `- item` → liste
 * - `> citation`
 * - `![texte alternatif](url)` → image
 * - `[[CTA:Libellé|url]]` → bouton d'appel à l'action
 */

const IMAGE_STYLE = "display:block;width:100%;max-width:540px;height:auto;border-radius:8px;margin:0 0 18px;";
const LINK_STYLE = "color:#07111f;text-decoration:underline;";

/** Formatage en ligne appliqué à du texte **déjà échappé**. */
function inline(escaped: string): string {
  return escaped
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) => {
      const url = safeHref(href);
      return url ? `<a href="${escapeHtml(url)}" style="${LINK_STYLE}">${label}</a>` : match;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
}

function paragraph(text: string): EmailBlock {
  return {
    kind: "raw",
    html: `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#07111f;">${inline(
      escapeHtml(text),
    ).replace(/\n/g, "<br />")}</p>`,
  };
}

function image(alt: string, href: string): EmailBlock | null {
  const url = safeHref(href);
  if (!url) return null;
  return {
    kind: "raw",
    html: `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" style="${IMAGE_STYLE}" />`,
  };
}

/** Découpe un corps Markdown en blocs de courriel. */
export function markdownToEmailBlocks(source: string): EmailBlock[] {
  const blocks: EmailBlock[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length) {
      blocks.push(paragraph(paragraphBuffer.join("\n")));
      paragraphBuffer = [];
    }
  };
  const flushList = () => {
    if (listBuffer.length) {
      blocks.push({
        kind: "raw",
        html: `<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.65;color:#07111f;">${listBuffer
          .map((item) => `<li style="margin:0 0 6px;">${inline(escapeHtml(item))}</li>`)
          .join("")}</ul>`,
      });
      listBuffer = [];
    }
  };
  const flushAll = () => {
    flushParagraph();
    flushList();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const cta = line.match(/^\[\[CTA:([^|\]]+)\|([^\]]+)\]\]$/);
    if (cta) {
      flushAll();
      blocks.push({ kind: "cta", label: cta[1].trim(), href: cta[2].trim() });
      continue;
    }

    const picture = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (picture) {
      flushAll();
      const block = image(picture[1], picture[2]);
      if (block) blocks.push(block);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushAll();
      blocks.push({ kind: "heading", text: heading[2].trim() });
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushAll();
      blocks.push({ kind: "quote", text: quote[1].trim() });
      continue;
    }

    const item = line.match(/^[-*]\s+(.*)$/);
    if (item) {
      flushParagraph();
      listBuffer.push(item[1].trim());
      continue;
    }

    flushList();
    paragraphBuffer.push(line.trim());
  }

  flushAll();
  return blocks;
}

/** Aperçu texte d'un corps Markdown — sert de repli d'aperçu de campagne. */
export function markdownToPlainText(source: string): string {
  return source
    .replace(/\[\[CTA:([^|\]]+)\|([^\]]+)\]\]/g, "$1 : $2")
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^[>*-]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
