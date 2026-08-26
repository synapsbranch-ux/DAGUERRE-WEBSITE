import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalEmpty, PortalHeader } from "@/components/portal/PortalPage";
import { Badge } from "@/components/ui/badge";
import { getPosts } from "@/lib/content";
import { getDictionaryFor } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { formatDate } from "@/lib/platform/format";
import { requirePortal } from "@/lib/platform/portal";
import { href } from "@/lib/routes";

/**
 * Articles dans l'espace client.
 *
 * La liste lit **la même source** que le blogue public : aucun article n'est
 * dupliqué, et les liens pointent vers l'URL canonique publique. Recréer ici
 * des pages d'articles produirait deux adresses pour le même texte, ce que les
 * moteurs traitent comme du contenu dupliqué.
 */
export default async function PortalArticlesPage({
  params,
}: PageProps<"/[locale]/espace-client/articles">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);
  const posts = await getPosts(locale);

  return (
    <div className="grid gap-8">
      <PortalHeader
        eyebrow={dict.platform.portal.title}
        title={dict.platform.portal.nav.articles}
        lead={dict.pages.blog.description}
      />

      {posts.length === 0 ? (
        <PortalEmpty
          title={dict.common.empty}
          description={dict.common.comingSoon}
          ctaLabel={dict.common.allArticles}
          ctaHref={href("blog", locale)}
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {posts.map((post) => (
            <li key={post.slug} className="py-5">
              <div className="flex flex-wrap items-center gap-2">
                {post.categories.slice(0, 2).map((category) => (
                  <Badge key={category} variant="outline">
                    {category}
                  </Badge>
                ))}
                <span className="text-xs text-muted-foreground">
                  {formatDate(post.publishedAt, locale)}
                </span>
              </div>
              <Link
                href={href("blog", locale, post.slug)}
                className="mt-2 block font-heading text-xl leading-snug hover:underline"
              >
                {post.title}
              </Link>
              {post.excerpt ? (
                <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">{post.excerpt}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
