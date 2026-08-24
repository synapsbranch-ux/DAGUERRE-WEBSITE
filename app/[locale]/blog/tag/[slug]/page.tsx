import type { Metadata } from "next";
import Link from "next/link";

import { PostRow } from "@/components/sections/PostRow";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getBlogTags, getPostsByTag } from "@/lib/content";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { href, humanizeSlug } from "@/lib/routes";
import { collectionPageSchema } from "@/lib/schema";
import { createMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const tags = await getBlogTags();
  return tags.map((tag) => ({ slug: tag.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/blog/tag/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const [posts, { pages }] = await Promise.all([getPostsByTag(slug), getDictionaryFor(locale)]);
  const name = humanizeSlug(slug);

  return createMetadata({
    locale,
    routeKey: "blogTag",
    segments: { fr: [slug], en: [slug] },
    title: `${name} — ${pages.blog.title}`,
    description: `${pages.blog.tag.description} ${name}.`,
    keywords: [name],
    // Les pages de tags vides sont exclues de l'index pour éviter le contenu
    // pauvre ; elles réapparaîtront dès qu'un article y sera rattaché.
    noIndex: posts.length === 0,
  });
}

export default async function TagPage({ params }: PageProps<"/[locale]/blog/tag/[slug]">) {
  const { slug } = await params;
  const [locale, dict, posts] = await Promise.all([
    getLocale(),
    getDictionary(),
    getPostsByTag(slug),
  ]);
  const page = dict.pages.blog.tag;
  const name = humanizeSlug(slug);

  return (
    <Container>
      <JsonLd
        data={collectionPageSchema({
          path: href("blogTag", locale, slug),
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
