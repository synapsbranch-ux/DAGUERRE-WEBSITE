import type { ReactNode } from "react";
import "../globals.css";
import { fontVariables } from "@/lib/fonts";
export default function ConnexionLayout({ children }: { children: ReactNode }) { return <html lang="fr" className={fontVariables}><body>{children}</body></html>; }
