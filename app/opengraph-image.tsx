import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

/**
 * Image Open Graph par défaut du site (1200 × 630).
 *
 * Elle s'applique à toutes les pages qui ne définissent pas leur propre image,
 * et sert d'aperçu lors des partages (LinkedIn, X, Slack, WhatsApp…).
 */
export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#ededed",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: 6,
            textTransform: "uppercase",
            opacity: 0.6,
          }}
        >
          Données · Stratégie · Impact
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 600 }}>{siteConfig.name}</div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 34,
              lineHeight: 1.35,
              opacity: 0.75,
              maxWidth: 900,
            }}
          >
            Analyste de données et gestionnaire de projet — business intelligence, suivi-évaluation
            et recherche.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, opacity: 0.5 }}>
          {siteConfig.url.replace(/^https?:\/\//, "")}
        </div>
      </div>
    ),
    size,
  );
}
