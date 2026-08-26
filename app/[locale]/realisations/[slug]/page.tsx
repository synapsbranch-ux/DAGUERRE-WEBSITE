import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import { EditorialImage } from "@/components/motion/EditorialImage";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { getAdjacentProjects, getProjectBySlug, getProjects, getRelatedProjects } from "@/lib/content";
import { href } from "@/lib/routes";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { projectSchema } from "@/lib/schema";
import { createMetadata } from "@/lib/seo";
import type { Project } from "@/lib/types";

/** Pré-génère une page par projet publié, pour chaque locale du layout racine. */
export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/realisations/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const project = await getProjectBySlug(slug, locale);
  if (!project) return {};

  await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "projects",
    segments: { fr: [project.slugs.fr], en: [project.slugs.en || project.slugs.fr] },
    title: project.seoTitle || project.title,
    description: project.seoDescription || project.summary,
    type: "article",
    image: project.ogImage ?? project.image,
    keywords: [...project.categories, ...project.technologies],
  });
}

export default async function RealisationPage({
  params,
}: PageProps<"/[locale]/realisations/[slug]">) {
  const { slug } = await params;
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const project = await getProjectBySlug(slug, locale);

  // Brouillon, archivé, planifié ou inconnu : la page n'existe pas.
  if (!project) notFound();

  const [related, adjacent] = await Promise.all([
    getRelatedProjects(project, locale),
    getAdjacentProjects(project, locale),
  ]);

  const detail = dict.pages.projects.detail;
  const labels = dict.pages.projects;

  /** Les quatre volets de l'étude de cas, dans l'ordre de lecture. */
  const caseStudy = [
    { title: detail.sections.probleme, body: project.problem },
    { title: detail.sections.methode, body: project.methodology },
    { title: detail.sections.resultats, body: project.results },
    { title: detail.sections.lecons, body: project.lessons },
  ].filter((block): block is { title: string; body: string } => Boolean(block.body));

  const facts = [
    project.client ? { label: detail.sections.client, value: project.client } : null,
    project.role ? { label: detail.sections.role, value: project.role } : null,
    project.year ? { label: labels.year, value: String(project.year) } : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);

  return (
    <Container>
      <JsonLd data={projectSchema(project)} />

      <PageHeader
        eyebrow={project.kicker || detail.eyebrow}
        title={project.title}
        description={project.summary}
      >
        {project.link ? (
          <Button asChild size="cta" variant="outline">
            <a href={project.link} target="_blank" rel="noreferrer noopener">
              {detail.sections.lien} →
            </a>
          </Button>
        ) : null}
      </PageHeader>

      {project.image ? (
        <EditorialImage
          src={project.image}
          alt=""
          className="aspect-[21/9] min-h-0 rounded-2xl border-0"
          sizes="(max-width: 1024px) 100vw, 1180px"
          priority
        />
      ) : null}

      {facts.length > 0 ? (
        <dl className="mt-10 grid gap-5 border-y border-border py-7 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {fact.label}
              </dt>
              <dd className="mt-1.5 text-base font-semibold">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="divide-y divide-border">
        {project.body ? (
          <Section title={detail.sections.presentation}>
            <div className="prose max-w-3xl text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                {project.body}
              </ReactMarkdown>
            </div>
          </Section>
        ) : null}

        {caseStudy.map((block) => (
          <Section key={block.title} title={block.title}>
            <div className="prose max-w-3xl text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                {block.body}
              </ReactMarkdown>
            </div>
          </Section>
        ))}

        <Gallery title={detail.sections.galerie} project={project} />

        {project.technologies.length > 0 || project.categories.length > 0 ? (
          <Section title={detail.sections.stack}>
            <div className="grid gap-6 sm:grid-cols-2">
              {project.technologies.length > 0 ? (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {labels.technologies}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {project.technologies.map((technology) => (
                      <li key={technology}>
                        <Badge variant="secondary">{technology}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {project.categories.length > 0 ? (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {labels.categories}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {project.categories.map((category) => (
                      <li key={category}>
                        <Badge variant="outline">{category}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Section>
        ) : null}

        {related.length > 0 ? (
          <Section title={detail.sections.related}>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((entry) => (
                <li key={entry.slug}>
                  <ProjectCard project={entry} locale={locale} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>

      {adjacent.previous || adjacent.next ? (
        <nav
          aria-label={detail.sections.pagination}
          className="mt-4 grid gap-4 border-t border-border py-8 sm:grid-cols-2"
        >
          {adjacent.previous ? (
            <Link
              href={href("projects", locale, adjacent.previous.slug)}
              className="group flex items-center gap-3 rounded-2xl border border-border p-5 transition-colors hover:border-[var(--copper)]/55"
            >
              <ArrowLeft className="size-4 shrink-0 text-[var(--copper-deep)] transition-transform group-hover:-translate-x-1" aria-hidden="true" />
              <span>
                <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {detail.sections.previous}
                </span>
                <span className="mt-1 block font-heading text-lg leading-snug">{adjacent.previous.title}</span>
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          {adjacent.next ? (
            <Link
              href={href("projects", locale, adjacent.next.slug)}
              className="group flex items-center justify-end gap-3 rounded-2xl border border-border p-5 text-right transition-colors hover:border-[var(--copper)]/55 sm:col-start-2"
            >
              <span>
                <span className="block text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {detail.sections.next}
                </span>
                <span className="mt-1 block font-heading text-lg leading-snug">{adjacent.next.title}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-[var(--copper-deep)] transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
        </nav>
      ) : null}

      <ContactCTA locale={locale} dict={dict} />
    </Container>
  );
}

function Gallery({ title, project }: { title: string; project: Project }) {
  if (project.gallery.length === 0) return null;

  return (
    <Section title={title}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {project.gallery.map((image) => (
          <li key={image}>
            <EditorialImage
              src={image}
              alt=""
              className="aspect-[4/3] min-h-0 rounded-xl border-0"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          </li>
        ))}
      </ul>
    </Section>
  );
}
