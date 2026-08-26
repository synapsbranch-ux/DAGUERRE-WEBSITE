import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { MarkdownHeading } from "@/lib/markdown-headings";

type ArticleMarkdownProps = {
  body: string;
  /**
   * Titres extraits du même corps par `extractMarkdownHeadings`. Chaque
   * `<h2>` rendu ici reçoit l'identifiant du titre dont le texte correspond
   * — c'est ce qui permet au rail de chapitres (Ruixen « Chapter Scrubber »)
   * de faire défiler jusqu'à lui.
   */
  headings?: MarkdownHeading[];
  className?: string;
};

/** Aplatit les enfants d'un élément Markdown en texte brut, pour l'apparier au titre extrait. */
function flattenToText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenToText).join("");
  return "";
}

/**
 * Rendu Markdown d'un article ou d'un projet.
 *
 * `skipHtml` : le Markdown du CMS ne peut jamais injecter de HTML brut.
 * La lecture reste calme — aucune animation dans le corps du texte.
 */
export function ArticleMarkdown({ body, headings = [], className }: ArticleMarkdownProps) {
  const idsByTitle = new Map(headings.map((heading) => [heading.title, heading.id]));

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h2({ node, children, ...props }) {
            // `node` porte l'AST mdast : utile à personne ici, mais il faut
            // l'exclure du spread pour ne pas atterrir comme attribut DOM.
            void node;
            return (
              <h2 id={idsByTitle.get(flattenToText(children))} className="scroll-mt-28" {...props}>
                {children}
              </h2>
            );
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
