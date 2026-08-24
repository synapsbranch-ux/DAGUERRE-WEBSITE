import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

import { fontVariables } from "@/lib/fonts";
import { defaultLocale } from "@/lib/i18n";
import { fr } from "@/lib/dictionaries/fr";
import { siteConfig } from "@/lib/site";

/**
 * 404 pour les URL qui ne correspondent à aucune locale — `/de/foo`, par
 * exemple. Elle court-circuite le rendu normal : il faut donc importer les
 * styles et les polices ici, et renvoyer un document HTML complet.
 *
 * Le 404 « interne » (appels à `notFound()` dans une page) reste géré par
 * `app/[locale]/not-found.tsx`, qui bénéficie du header et du footer.
 */
export const metadata: Metadata = {
  title: `${fr.notFound.title} — ${siteConfig.name}`,
  description: fr.notFound.body,
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  return (
    <html lang={defaultLocale} className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-24">
          <p className="eyebrow">{fr.notFound.eyebrow}</p>
          <h1 className="mt-4 font-heading text-5xl leading-tight">{fr.notFound.title}</h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            {fr.notFound.body}
          </p>
          <div className="mt-9">
            <Link
              href={`/${defaultLocale}`}
              className="inline-flex h-11 items-center rounded-md border border-primary px-5.5 font-heading text-[15px] text-primary transition-colors hover:bg-primary/12"
            >
              {fr.notFound.cta}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
