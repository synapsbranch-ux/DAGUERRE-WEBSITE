import type { Metadata } from "next";
import Link from "next/link";

import { mainNavKeys } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
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

export default async function NotFound() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <Container>
      <div className="py-24 sm:py-32">
        <p className="eyebrow">{dict.notFound.eyebrow}</p>
        <h1 className="mt-4 font-heading text-4xl leading-[1.06] sm:text-6xl">
          {dict.notFound.title}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          {dict.notFound.body}
        </p>

        <div className="mt-9">
          <Button asChild size="cta">
            <Link href={href("home", locale)}>{dict.notFound.cta}</Link>
          </Button>
        </div>

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
