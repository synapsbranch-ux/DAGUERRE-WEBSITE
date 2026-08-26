import type { Metadata } from "next";
import Link from "next/link";

import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";

import { BlogCoverflow } from "@/components/sections/BlogCoverflow";
import { FeaturedArticlePanel } from "@/components/sections/FeaturedArticlePanel";
import { PostRow } from "@/components/sections/PostRow";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Section } from "@/components/ui/Section";
import { getBlogCategories, getBlogTags, getFeaturedPosts, getPostsPage } from "@/lib/content";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { blogSchema } from "@/lib/schema";
import { createMetadata } from "@/lib/seo";

const PER_PAGE = 10;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { pages } = await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "blog",
    title: pages.blog.metaTitle,
    description: pages.blog.metaDescription,
    keywords: ["articles data", "veille", "tutoriels", "analyse de données"],
  });
}

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

/**
 * Blogue.
 *
 * Seuls les articles `published` dont la date de parution est passée sont
 * listés — la règle est appliquée par `getPostsPage`, pas ici. La recherche et
 * la pagination vivent dans l'URL pour rester partageables et indexables.
 */
export default async function BlogPage({ searchParams }: PageProps<"/[locale]/blog">) {
  const query = await searchParams;
  const q = first(query.q);
  const page = Math.max(1, Number(first(query.page)) || 1);

  const [locale, dict, results, featured, categories, tags] = await Promise.all([
    getLocale(),
    getDictionary(),
    getPostsPage({ q, page, perPage: PER_PAGE }),
    getFeaturedPosts(),
    getBlogCategories(),
    getBlogTags(),
  ]);
  const labels = dict.pages.blog;
  const base = href("blog", locale);

  const buildHref = (target: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (target > 1) params.set("page", String(target));
    const search = params.toString();
    return search ? `${base}?${search}` : base;
  };

  return (
    <Container>
      <JsonLd data={blogSchema()} />

      <PageHeader eyebrow={labels.eyebrow} title={labels.title} description={labels.description} />

      <div className="divide-y divide-border">
        <Section title={dict.common.search}>
          <form action={base} method="get" className="flex max-w-md gap-2">
            <Label htmlFor="q" className="sr-only">
              {dict.common.search}
            </Label>
            <Input
              id="q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder={dict.common.searchPlaceholder}
            />
            <Button type="submit" variant="secondary">
              {dict.common.search}
            </Button>
            {q ? (
              <Button asChild variant="ghost">
                <Link href={base}>{dict.common.resetFilters}</Link>
              </Button>
            ) : null}
          </form>
          {q ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {results.total} {dict.common.resultCount} · « {q} »
            </p>
          ) : null}
        </Section>

        {/* La mise en avant n'a de sens que sur la vue non filtrée. */}
        {!q && page === 1 && featured.length > 0 ? (
          <Section title={labels.featured}>
            <FeaturedArticlePanel post={featured[0]} locale={locale} dict={dict} />
          </Section>
        ) : null}

        {!q && page === 1 ? (
          <BlogCoverflow posts={results.items} locale={locale} dict={dict} label={labels.recent} />
        ) : null}

        <Section title={labels.recent}>
          {results.items.length > 0 ? (
            <>
              <div className="border-t border-border">
                {results.items.map((post) => (
                  <PostRow key={post.slug} post={post} locale={locale} dict={dict} />
                ))}
              </div>
              <Pagination
                page={results.page}
                pageCount={results.pageCount}
                buildHref={buildHref}
                labels={{
                  previous: dict.common.previousPage,
                  next: dict.common.nextPage,
                  status: dict.common.pagination,
                }}
              />
            </>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{labels.empty}</EmptyTitle>
                <EmptyDescription>{labels.description}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </Section>

        {/* Point d'entrée d'abonnement là où le lecteur vient de lire. */}
        <Section
          title={dict.platform.newsletter.title}
          description={dict.platform.newsletter.lead}
        >
          <div className="max-w-xl">
            <NewsletterSignup dict={dict} locale={locale} source="blog" />
          </div>
        </Section>

        <Section title={labels.categories}>
          {categories.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={href("blogCategory", locale, category.slug)}
                    className="inline-flex rounded-sm border border-border px-3 py-1 text-sm transition-colors hover:bg-foreground/7"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{labels.emptyCategories}</p>
          )}
        </Section>

        <Section title={labels.tags}>
          {tags.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag.slug}>
                  <Link
                    href={href("blogTag", locale, tag.slug)}
                    className="inline-flex rounded-sm border border-border px-3 py-1 text-sm transition-colors hover:bg-foreground/7"
                  >
                    #{tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{labels.emptyTags}</p>
          )}
        </Section>
      </div>
    </Container>
  );
}
