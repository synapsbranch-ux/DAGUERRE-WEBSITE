import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /*
     * Le layout racine vit sous `app/[locale]/` : une URL dont le premier
     * segment n'est pas une locale valide n'a aucun layout dans lequel se
     * rendre. `global-not-found.tsx` couvre ce cas — c'est précisément la
     * situation que la doc Next cite pour justifier cette option.
     */
    globalNotFound: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
  },
};

export default nextConfig;
