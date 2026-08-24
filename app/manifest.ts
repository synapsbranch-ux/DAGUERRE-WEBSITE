import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

/**
 * Génère `/manifest.webmanifest`.
 *
 * Améliore l'expérience mobile (ajout à l'écran d'accueil, couleur de thème),
 * un signal pris en compte par les audits Lighthouse.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.title,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: siteConfig.themeColor,
    lang: siteConfig.lang,
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
