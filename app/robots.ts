import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * Génère `/robots.txt`.
 *
 * Tout le site public est explorable. Les zones techniques et la future
 * interface d'administration sont exclues.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/_next/", "/*?*"],
      },
      {
        // Google et Bing gèrent correctement les paramètres d'URL : on ne leur
        // impose pas la restriction ci-dessus, pour ne pas bloquer la
        // pagination ni la recherche interne.
        userAgent: ["Googlebot", "Bingbot"],
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
