import type { ReactNode } from "react";

type SectionProps = {
  /** Ancre de la section, ex. `#expertise`. */
  id?: string;
  /** Sur-titre laiton facultatif, au-dessus du `h2`. */
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

/**
 * Bloc de contenu d'une page. Le titre est un `<h2>` afin de préserver la
 * hiérarchie sous le `<h1>` du `PageHeader`.
 */
export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className = "",
}: SectionProps) {
  return (
    <section id={id} className={`scroll-mt-24 py-12 sm:py-16 ${className}`}>
      {eyebrow ? <p className="eyebrow mb-4">| {eyebrow} |</p> : null}
      <h2 className="font-heading text-2xl leading-tight sm:text-[32px]">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-7">{children}</div> : null}
    </section>
  );
}
