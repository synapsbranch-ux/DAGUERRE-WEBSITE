import Link from "next/link";

import { PostRow } from "@/components/sections/PostRow";
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

/**
 * Articles récents sur l'accueil.
 *
 * La maquette présente le blogue en **liste éditoriale**, jamais en cartes :
 * date à gauche, titre et chapeau au centre, « Lire → » à droite.
 */
export function BlogPreview({ locale, dict, posts, section: cms }: BlogPreviewProps) {
  const section = dict.home.blog;
  if (posts.length === 0) return null;

  return (
    <Container>
      <section id="blog" className="scroll-mt-24 py-20 sm:py-24">
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

          <div className="mt-9 border-t border-border">
            {posts.map((post) => (
              <PostRow key={post.slug} post={post} locale={locale} dict={dict} />
            ))}
          </div>
      </section>
    </Container>
  );
}
