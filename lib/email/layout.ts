import type { Locale } from "@/lib/i18n";
import { escapeHtml, safeHref } from "@/lib/platform/sanitize";
import { siteConfig, siteUrl } from "@/lib/site";

/**
 * Gabarit HTML des courriels.
 *
 * ## Pourquoi un système à part
 *
 * Les composants du site reposent sur Tailwind, les variables CSS et le
 * moteur de rendu React. Aucun client de messagerie ne sait les interpréter :
 * Outlook ignore le `flex`, Gmail supprime les `<style>` distants, la plupart
 * ne connaissent pas les variables CSS. Les courriels sont donc écrits en
 * tableaux et en styles en ligne — laid à lire, mais c'est la seule mise en
 * page qui arrive intacte partout.
 *
 * La charte reste celle du site : mêmes couleurs, même hiérarchie, mêmes
 * intitulés.
 */

/** Palette dérivée de `app/globals.css`, transposée en valeurs littérales. */
const INK = "#07111f";
const PAPER = "#faf8f4";
const MUTED = "#5b6472";
const BORDER = "#e3ded4";
const ACCENT = "#07111f";

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export type EmailBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "definition"; rows: { term: string; value: string }[] }
  | { kind: "cta"; label: string; href: string }
  | { kind: "quote"; text: string }
  | { kind: "raw"; html: string };

function renderBlock(block: EmailBlock): string {
  switch (block.kind) {
    case "heading":
      return `<h2 style="margin:28px 0 10px;font-size:19px;line-height:1.3;color:${INK};font-weight:600;">${escapeHtml(block.text)}</h2>`;
    case "paragraph":
      return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${INK};">${escapeHtml(block.text).replace(/\n/g, "<br />")}</p>`;
    case "quote":
      return `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${BORDER};background:${PAPER};font-size:15px;line-height:1.6;color:${INK};">${escapeHtml(block.text).replace(/\n/g, "<br />")}</blockquote>`;
    case "list":
      return `<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.65;color:${INK};">${block.items
        .map((item) => `<li style="margin:0 0 6px;">${escapeHtml(item)}</li>`)
        .join("")}</ul>`;
    case "definition":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 18px;border-collapse:collapse;">${block.rows
        .map(
          (row) =>
            `<tr><td style="padding:7px 12px 7px 0;font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top;border-bottom:1px solid ${BORDER};">${escapeHtml(row.term)}</td><td style="padding:7px 0;font-size:14px;color:${INK};vertical-align:top;border-bottom:1px solid ${BORDER};">${escapeHtml(row.value)}</td></tr>`,
        )
        .join("")}</table>`;
    case "cta": {
      const href = safeHref(block.href);
      if (!href) return "";
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr><td style="background:${ACCENT};border-radius:6px;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(block.label)}</a></td></tr></table>`;
    }
    case "raw":
      return block.html;
  }
}

/** Version texte, servie en parallèle du HTML pour les clients qui l'exigent. */
function blockToText(block: EmailBlock): string {
  switch (block.kind) {
    case "heading":
      return `\n${block.text.toUpperCase()}\n`;
    case "paragraph":
    case "quote":
      return `${block.text}\n`;
    case "list":
      return `${block.items.map((item) => `- ${item}`).join("\n")}\n`;
    case "definition":
      return `${block.rows.map((row) => `${row.term} : ${row.value}`).join("\n")}\n`;
    case "cta":
      return `${block.label} : ${block.href}\n`;
    case "raw":
      return "";
  }
}

export type EmailDocument = {
  locale: Locale;
  previewText?: string;
  title: string;
  blocks: EmailBlock[];
  /** Pied de page marketing : mention légale et lien de désabonnement. */
  unsubscribeUrl?: string;
  footerNote?: string;
};

const FOOTER_TRANSACTIONAL: Record<Locale, string> = {
  fr: "Vous recevez ce message parce qu'il concerne une demande ou un compte chez Daguerre.",
  en: "You are receiving this message because it concerns a request or an account with Daguerre.",
};

const FOOTER_MARKETING: Record<Locale, string> = {
  fr: "Vous recevez cette infolettre parce que vous vous y êtes abonné.",
  en: "You are receiving this newsletter because you subscribed to it.",
};

const UNSUBSCRIBE_LABEL: Record<Locale, string> = {
  fr: "Se désabonner",
  en: "Unsubscribe",
};

/** Assemble le document en HTML complet et en texte brut. */
export function renderEmail(document: EmailDocument): { html: string; text: string } {
  const body = document.blocks.map(renderBlock).join("\n");
  const footerNote =
    document.footerNote ??
    (document.unsubscribeUrl ? FOOTER_MARKETING[document.locale] : FOOTER_TRANSACTIONAL[document.locale]);

  const unsubscribe = document.unsubscribeUrl
    ? `<p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:${MUTED};"><a href="${escapeHtml(document.unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline;">${UNSUBSCRIBE_LABEL[document.locale]}</a></p>`
    : "";

  // Le texte de prévisualisation apparaît dans la liste des messages, jamais
  // dans le corps : masqué visuellement, mais lu par les clients de messagerie.
  const preview = document.previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(document.previewText)}</div>`
    : "";

  const html = `<!doctype html>
<html lang="${document.locale}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(document.title)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};font-family:${FONT_STACK};">
${preview}
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${PAPER};padding:28px 12px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid ${BORDER};border-radius:10px;">
<tr><td style="padding:26px 30px 0;">
<a href="${escapeHtml(siteUrl)}" style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${INK};text-decoration:none;">${escapeHtml(siteConfig.name)}</a>
<span style="margin-left:8px;font-size:12px;color:${MUTED};">${escapeHtml(siteConfig.baseline[document.locale])}</span>
</td></tr>
<tr><td style="padding:18px 30px 6px;">
<h1 style="margin:0 0 16px;font-size:23px;line-height:1.25;color:${INK};font-weight:700;">${escapeHtml(document.title)}</h1>
${body}
</td></tr>
<tr><td style="padding:8px 30px 26px;">
<hr style="border:none;border-top:1px solid ${BORDER};margin:18px 0 14px;" />
<p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">${escapeHtml(footerNote)}</p>
${unsubscribe}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    document.title,
    "",
    ...document.blocks.map(blockToText),
    "",
    footerNote,
    document.unsubscribeUrl ? `${UNSUBSCRIBE_LABEL[document.locale]} : ${document.unsubscribeUrl}` : "",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { html, text };
}

/** URL absolue d'un chemin interne, pour les liens de courriel. */
export function absoluteLink(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
