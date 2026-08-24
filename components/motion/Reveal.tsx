import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Révélation progressive en CSS, sans hydratation ni contenu masqué au SSR. */
export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  return (
    <div
      className={cn("reveal", `reveal-${direction}`, className)}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("stagger", className)}>{children}</div>;
}
