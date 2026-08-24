import Link from "next/link";

import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import type { Post } from "@/lib/types";

type PostRowProps = {
  post: Post;
  locale: Locale;
  dict: Dictionary;
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
 * Ligne d'article : la maquette présente le blogue en **liste éditoriale**,
 * pas en cartes. Trois colonnes — date, titre + chapeau, « Lire → » — séparées
 * par un filet bas.
 */
export function PostRow({ post, locale, dict }: PostRowProps) {
  return (
    <Link
      href={href("blog", locale, post.slug)}
      className="group grid grid-cols-1 items-baseline gap-2 border-b border-border py-6 sm:grid-cols-[120px_1fr_100px] sm:gap-8"
    >
      <time dateTime={post.publishedAt} className="tnum text-xs text-muted-foreground">
        {formatDate(post.publishedAt, locale)}
      </time>

      <div>
        <h3 className="font-heading text-xl leading-tight transition-colors group-hover:text-primary sm:text-[25px]">
          {post.title}
        </h3>
        <p className="mt-2 max-w-[80ch] text-[13.5px] leading-relaxed text-muted-foreground">
          {post.excerpt}
        </p>
      </div>

      <span className="text-[13px] text-primary sm:text-right">{dict.common.readMore} →</span>
    </Link>
  );
}
