import { Manrope, Space_Grotesk } from "next/font/google";

/**
 * Polices du site, partagées entre le layout public et le tableau de bord.
 *
 * Une sans-serif très lisible pour l'interface et une display géométrique
 * pour les titres. Next les auto-héberge : aucun appel Google côté navigateur.
 */

export const fontHeading = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const fontBody = Manrope({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** À poser sur `<html>`. */
export const fontVariables = `${fontHeading.variable} ${fontBody.variable}`;
