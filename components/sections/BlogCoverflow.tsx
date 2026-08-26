"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { CoverflowCarousel, type CoverflowSlide } from "@/components/ruixen/coverflow-carousel";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { isUnconfiguredRemoteImage, resolveKnownImageSource } from "@/lib/media/assets";
import { href } from "@/lib/routes";
import type { Post } from "@/lib/types";

type BlogCoverflowProps = {
  posts: Post[];
  locale: Locale;
  dict: Dictionary;
  label: string;
};

type Slide = CoverflowSlide & { href: string };

/**
 * Articles secondaires — Ruixen UI « Coverflow Carousel ».
 *
 * Le composant ne suit qu'une carte centrée ; il n'ouvre rien lui-même. Cette
 * enveloppe retient l'article centré (`onSelectedChange`) pour offrir un lien
 * de lecture — le même schéma que l'éventail de projets sur l'accueil.
 *
 * N'apparaît que pour les articles qui ont un visuel : le carrousel peint ses
 * cartes en image, il n'a pas de repli texte.
 */
export function BlogCoverflow({ posts, locale, dict, label }: BlogCoverflowProps) {
  const slides: Slide[] = posts
    .map((post): Slide | null => {
      if (!post.image) return null;
      const source = resolveKnownImageSource(post.image);
      return {
        src: typeof source === "string" ? source : source.src,
        alt: "",
        title: post.title,
        href: href("blog", locale, post.slug),
        unoptimized: isUnconfiguredRemoteImage(source),
      };
    })
    .filter((slide): slide is Slide => slide !== null);

  const [selected, setSelected] = React.useState(0);
  const active = slides[selected];

  if (slides.length < 3) return null;

  return (
    <div>
      <CoverflowCarousel
        slides={slides}
        label={label}
        showNavigation
        showPagination
        onSelectedChange={setSelected}
      />

      {active ? (
        <p className="mt-6 text-center">
          <Link
            href={active.href}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--copper-deep)] underline-offset-4 hover:underline"
          >
            {dict.common.readMore} — {active.title}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </p>
      ) : null}
    </div>
  );
}
