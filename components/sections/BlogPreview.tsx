import Link from "next/link";

import AccordionEditorial from "@/components/ruixen/accordion-editorial";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import type { HomeSection, Post } from "@/lib/types";

type BlogPreviewProps = {
  locale: Locale;
  dict: Dictionary;
  posts: Post[];
  /** Surcharges d’en-tête pilotées depuis le CMS. */
  section?: HomeSection;
};

/** Format de date de la maquette : `JJ.MM.AAAA`, chiffres alignés. */
function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(/[/\s-]/g, ".");
}

/**
 * Articles récents sur l'accueil.
 *
 * Ruixen UI « Accordion Editorial » : des titres surdimensionnés qui
 * s'ouvrent sur leur chapô, sans vignette ni carte — la bande reste
 * typographique, comme la maquette présente le blogue.
 *
 * Sans article publié, rien n'est rendu : l'accueil ne montre jamais une
 * rubrique vide, et le blogue disparaît alors aussi de la navigation
 * principale (voir `lib/navigation.ts`).
 */
export function BlogPreview({ locale, dict, posts, section: cms }: BlogPreviewProps) {
  const section = dict.home.blog;
  if (posts.length === 0) return null;

  return (
    <section id="blog" className="scroll-mt-24 py-[var(--band-space)]">
      <Container>
        <div className="flex flex-wrap items-end gap-6">
          <div className="flex-1">
            <p className="eyebrow">{cms?.eyebrow || section.eyebrow}</p>
            <h2 className="mt-4 max-w-[24ch] text-3xl leading-tight sm:text-[46px]">
              {cms?.title || section.title}
            </h2>
          </div>
          <Button asChild variant="ghost">
            <Link href={href("blog", locale)}>{dict.common.allArticles} →</Link>
          </Button>
        </div>

        <div className="mt-10 border-t border-border">
          <AccordionEditorial
            defaultValue={posts[0]?.slug}
            items={posts.map((post) => ({
              id: post.slug,
              title: post.title,
              meta: [
                formatDate(post.publishedAt, locale),
                post.readingTime ? `${post.readingTime} ${dict.common.readingTime}` : null,
              ]
                .filter(Boolean)
                .join(" · "),
              content: (
                <>
                  <p className="max-w-[70ch]">{post.excerpt}</p>
                  <Link
                    href={href("blog", locale, post.slug)}
                    className="mt-4 inline-flex items-center gap-1.5 font-semibold text-[var(--copper-deep)] underline-offset-4 hover:underline"
                  >
                    {dict.common.readMore} →
                  </Link>
                </>
              ),
            }))}
          />
        </div>
      </Container>
    </section>
  );
}
