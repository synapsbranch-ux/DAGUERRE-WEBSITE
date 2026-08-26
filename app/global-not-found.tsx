import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

import { PerspectiveText } from "@/components/ruixen/perspective-text";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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
 * `app/[locale]/not-found.tsx`, qui bénéficie du header et du footer — les
 * deux partagent la même carcasse « Empty » (shadcn) et le même numéro en
 * Ruixen UI « Perspective Text ».
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
          <Empty className="border-none p-0 md:p-0">
            <EmptyHeader className="max-w-xl gap-3">
              <EmptyMedia className="mb-1 text-primary/60">
                <PerspectiveText
                  as="span"
                  text="404"
                  tilt={26}
                  curve={0.1}
                  className="text-[6rem] leading-none sm:text-[8rem]"
                />
              </EmptyMedia>
              <p className="eyebrow">{fr.notFound.eyebrow}</p>
              <EmptyTitle>
                <h1 className="font-heading text-4xl leading-tight sm:text-5xl">{fr.notFound.title}</h1>
              </EmptyTitle>
              <EmptyDescription className="max-w-xl text-base leading-relaxed">
                {fr.notFound.body}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                href={`/${defaultLocale}`}
                className="inline-flex h-11 items-center rounded-md border border-primary px-5.5 font-heading text-[15px] text-primary transition-colors hover:bg-primary/12"
              >
                {fr.notFound.cta}
              </Link>
            </EmptyContent>
          </Empty>
        </main>
      </body>
    </html>
  );
}
