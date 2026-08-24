import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Déplacement très léger piloté par la timeline CSS de défilement. */
export function ParallaxImage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("parallax", className)}>{children}</div>;
}
