import type { Metadata } from "next";
import Link from "next/link";

import { mainNavKeys } from "@/components/layout/Navigation";
import { PerspectiveText } from "@/components/ruixen/perspective-text";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { href, routes } from "@/lib/routes";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();

  return {
    title: dict.notFound.title,
    description: dict.notFound.body,
    // Obligatoire : sans cette ligne, la page hériterait du `index, follow` du
    // layout racine, qui contredirait le `noindex` ajouté par Next.js.
    robots: { index: false, follow: true },
  };
}

/**
 * 404 interne — même carcasse « Empty » (shadcn) que les états vides du CMS
 * ailleurs sur le site, avec le numéro composé en Ruixen UI « Perspective
 * Text » (déjà utilisé pour les titres de section sur la page Compétences)
 * plutôt qu'un simple chiffre statique.
 */
export default async function NotFound() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <Container>
      <div className="py-24 sm:py-32">
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
            <p className="eyebrow">{dict.notFound.eyebrow}</p>
            <EmptyTitle>
              <h1 className="font-heading text-4xl leading-[1.06] sm:text-5xl">{dict.notFound.title}</h1>
            </EmptyTitle>
            <EmptyDescription className="max-w-xl text-base leading-relaxed">
              {dict.notFound.body}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="cta">
              <Link href={href("home", locale)}>{dict.notFound.cta}</Link>
            </Button>
          </EmptyContent>
        </Empty>

        <nav aria-label={dict.notFound.goTo} className="mt-14 border-t border-border pt-6">
          <h2 className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {dict.notFound.goTo}
          </h2>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-heading text-lg">
            {mainNavKeys
              .filter((key) => key !== "home")
              .map((key) => (
                <li key={key}>
                  <Link href={href(key, locale)} className="transition-colors hover:text-primary">
                    {routes[key].label[locale]}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </div>
    </Container>
  );
}
