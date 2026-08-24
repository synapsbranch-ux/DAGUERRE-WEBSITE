import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { EditorialImage } from "@/components/motion/EditorialImage";
import { PostRow } from "@/components/sections/PostRow";
import { JsonLd } from "@/components/seo/JsonLd";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getPostBySlug, getPosts, getRelatedPosts } from "@/lib/content";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { href, humanizeSlug } from "@/lib/routes";
import { blogPostingSchema } from "@/lib/schema";
import { createMetadata } from "@/lib/seo";

/** Pré-génère une page par article publié, pour chaque locale du layout racine. */
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const post = await getPostBySlug(slug, locale);
  // Un brouillon, un contenu archivé ou une parution future n'existe pas
  // publiquement : ni page, ni métadonnées.
  if (!post) return {};

  await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "blog",
    segments: { fr: [post.slugs.fr], en: [post.slugs.en || post.slugs.fr] },
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    type: "article",
    image: post.ogImage ?? post.image,
    keywords: [...post.categories, ...post.tags],
    article: {
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      section: post.categories[0],
      tags: post.tags,
    },
  });
}

export default async function ArticlePage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { slug } = await params;
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const post = await getPostBySlug(slug, locale);

  // Règle absolue : hors des contenus publiés et déjà parus, la page n'existe
  // pas — quel que soit le slug demandé.
  if (!post) notFound();

  const related = await getRelatedPosts(post, locale);
  const article = dict.pages.blog.article;

  return (
    <Container>
      <JsonLd data={blogPostingSchema(post)} />

      <article>
        <PageHeader eyebrow={article.eyebrow} title={post.title} description={post.excerpt}>
          <p className="tnum text-xs text-muted-foreground">
            {dict.common.publishedOn} <time dateTime={post.publishedAt}>{post.publishedAt.slice(0, 10)}</time>
            {post.author ? ` · ${post.author}` : null}
            {post.readingTime ? ` · ${post.readingTime} ${dict.common.readingTime}` : null}
          </p>
        </PageHeader>

        {post.image ? (
          <EditorialImage
            src={post.image}
            alt=""
            className="aspect-[21/9] min-h-0 rounded-2xl border-0"
            sizes="(max-width: 1024px) 100vw, 1180px"
            priority
          />
        ) : null}

        <div className="divide-y divide-border">
          {post.body ? (
            <Section title={article.content}>
              {/* `skipHtml` : le Markdown du CMS ne peut pas injecter de HTML brut. */}
              <div className="prose max-w-3xl text-foreground prose-p:leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                  {post.body}
                </ReactMarkdown>
              </div>
            </Section>
          ) : null}

          <Section title={article.taxonomies}>
            {post.categories.length > 0 || post.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {post.categories.map((category) => (
                  <li key={`categorie-${category}`}>
                    <Link
                      href={href("blogCategory", locale, category)}
                      className="inline-flex rounded-sm border border-border px-3 py-1 text-sm transition-colors hover:bg-foreground/7"
                    >
                      {humanizeSlug(category)}
                    </Link>
                  </li>
                ))}
                {post.tags.map((tag) => (
                  <li key={`tag-${tag}`}>
                    <Link
                      href={href("blogTag", locale, tag)}
                      className="inline-flex rounded-sm border border-border px-3 py-1 text-sm transition-colors hover:bg-foreground/7"
                    >
                      #{humanizeSlug(tag)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{dict.common.empty}</p>
            )}
          </Section>

          {related.length > 0 ? (
            <Section title={article.related}>
              <div className="border-t border-border">
                {related.map((entry) => (
                  <PostRow key={entry.slug} post={entry} locale={locale} dict={dict} />
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      </article>
    </Container>
  );
}
