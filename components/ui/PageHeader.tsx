import type { ReactNode } from "react";

type PageHeaderProps = {
  /** Sur-titre encadré de barres verticales, comme dans la maquette. */
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
};

/** En-tête de page : unique `<h1>` de la page. */
export function PageHeader({ eyebrow, title, description, children }: PageHeaderProps) {
  return (
    <header className="border-b border-border py-14 sm:py-20">
      {eyebrow ? <p className="eyebrow">| {eyebrow} |</p> : null}
      <h1 className="mt-5 max-w-4xl font-heading text-4xl leading-[1.04] sm:text-6xl">{title}</h1>
      {description ? (
        <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-muted-foreground sm:text-[17px]">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-8 flex flex-wrap gap-3.5">{children}</div> : null}
    </header>
  );
}
