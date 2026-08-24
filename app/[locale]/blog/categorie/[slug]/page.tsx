import type { Metadata } from "next";
import Link from "next/link";

import { PostRow } from "@/components/sections/PostRow";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getBlogCategories, getPostsByCategory } from "@/lib/content";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { href, humanizeSlug } from "@/lib/routes";
import { collectionPageSchema } from "@/lib/schema";
import { createMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const categories = await getBlogCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog/categorie/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const [posts, { pages }] = await Promise.all([
    getPostsByCategory(slug),
    getDictionaryFor(locale),
  ]);
  const name = humanizeSlug(slug);

  return createMetadata({
    locale,
    routeKey: "blogCategory",
    segments: { fr: [slug], en: [slug] },
    title: `${name} — ${pages.blog.title}`,
    description: `${pages.blog.category.description} ${name}.`,
    keywords: [name],
    // Une page de catégorie vide n'apporte rien à Google : on ne l'indexe pas
    // tant qu'elle ne contient aucun article.
    noIndex: posts.length === 0,
  });
}

export default async function CategoriePage({
  params,
}: PageProps<"/[locale]/blog/categorie/[slug]">) {
  const { slug } = await params;
  const [locale, dict, posts] = await Promise.all([
    getLocale(),
    getDictionary(),
    getPostsByCategory(slug),
  ]);
  const page = dict.pages.blog.category;
  const name = humanizeSlug(slug);

  return (
    <Container>
      <JsonLd
        data={collectionPageSchema({
          path: href("blogCategory", locale, slug),
          title: `${page.eyebrow} : ${name}`,
          description: page.description,
          items: posts.map((post) => href("blog", locale, post.slug)),
        })}
      />

      <PageHeader eyebrow={page.eyebrow} title={name} description={page.description}>
        <Button asChild variant="secondary">
          <Link href={href("blog", locale)}>{dict.common.backToBlog}</Link>
        </Button>
      </PageHeader>

      <Section title={dict.pages.blog.title}>
        {posts.length > 0 ? (
          <div className="border-t border-border">
            {posts.map((post) => (
              <PostRow key={post.slug} post={post} locale={locale} dict={dict} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/60">{page.empty}</p>
        )}
      </Section>
    </Container>
  );
}
