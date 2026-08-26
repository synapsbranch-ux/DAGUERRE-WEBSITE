import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { MarkdownHeading } from "@/lib/markdown-headings";

type ArticleMarkdownProps = {
  body: string;
  /**
   * Titres extraits du même corps par `extractMarkdownHeadings`, dans
   * l'ordre du document. Chaque `<h2>` rendu ici reçoit l'identifiant du
   * titre correspondant, au même rang — c'est ce qui permet au rail de
   * chapitres (Ruixen « Chapter Scrubber ») de faire défiler jusqu'à lui.
   */
  headings?: MarkdownHeading[];
  className?: string;
};

/**
 * Rendu Markdown d'un article ou d'un projet.
 *
 * `skipHtml` : le Markdown du CMS ne peut jamais injecter de HTML brut.
 * La lecture reste calme — aucune animation dans le corps du texte.
 */
export function ArticleMarkdown({ body, headings = [], className }: ArticleMarkdownProps) {
  let headingIndex = 0;

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h2: ({ node: _node, ...props }) => {
            const id = headings[headingIndex]?.id;
            headingIndex += 1;
            return <h2 id={id} className="scroll-mt-28" {...props} />;
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
