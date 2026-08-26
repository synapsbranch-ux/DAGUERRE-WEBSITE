"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { SidePanel } from "@/components/cult/side-panel";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import type { Post } from "@/lib/types";

type FeaturedArticlePanelProps = {
  post: Post;
  locale: Locale;
  dict: Dictionary;
};

/** Format de date : `JJ.MM.AAAA`, chiffres alignés. */
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
 * Article mis en avant — Cult UI « Side Panel ».
 *
 * Le composant d'origine cache et révèle un lecteur vidéo derrière un panneau
 * qui s'élargit ; ici, c'est le chapô et le lien de lecture qui apparaissent.
 * L'interaction reste la sienne : un panneau étroit qui s'ouvre en ressort,
 * pas une carte statique.
 */
export function FeaturedArticlePanel({ post, locale, dict }: FeaturedArticlePanelProps) {
  const [open, setOpen] = React.useState(false);
  const labels = dict.pages.blog;
  const meta = [
    formatDate(post.publishedAt, locale),
    post.readingTime ? `${post.readingTime} ${dict.common.readingTime}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SidePanel
      panelOpen={open}
      handlePanelOpen={() => setOpen((value) => !value)}
      className="w-full rounded-2xl border border-border bg-[var(--navy-950)] md:w-full"
      renderButton={(toggle) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-4 py-4 pr-4 text-left"
        >
          <span>
            <span className="eyebrow-light">{labels.featured}</span>
            <span className="mt-1.5 block font-heading text-xl leading-snug text-white sm:text-2xl">
              {post.title}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-white/20 text-white transition-transform"
            style={{ transform: open ? "rotate(45deg)" : "none" }}
          >
            <ArrowRight className="size-4" />
          </span>
        </button>
      )}
    >
      <div className="px-4 pb-6 pt-1 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/50">{meta}</p>
        <p className="mt-3 max-w-[62ch] text-[15px] leading-7 text-white/78">{post.excerpt}</p>
        <Link
          href={href("blog", locale, post.slug)}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--copper-soft)] underline-offset-4 hover:underline"
        >
          {dict.common.readMore} <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </SidePanel>
  );
}
