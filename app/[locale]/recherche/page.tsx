import type { Metadata } from "next";

import { ContactCTA } from "@/components/sections/ContactCTA";
import { EditorialImage } from "@/components/motion/EditorialImage";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { createMetadata } from "@/lib/seo";
import { getResearch } from "@/lib/content";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recherche">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { pages } = await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "research",
    title: pages.research.metaTitle,
    description: pages.research.metaDescription,
    keywords: ["travaux de recherche", "mémoire", "publications", "méthodologie"],
  });
}

/** Travaux de recherche publiés — MongoDB exclusivement. */
export default async function RecherchePage() {
  const [locale, dict, research] = await Promise.all([getLocale(), getDictionary(), getResearch()]);
  const page = dict.pages.research;

  return (
    <Container>
      <PageHeader eyebrow={page.eyebrow} title={page.title} description={page.description} />

      {research.length > 0 ? (
        <ul className="grid gap-5 border-t border-border py-14">
          {research.map((entry, index) => (
            <li key={entry.id}>
              <Reveal delay={index * 60}>
                <article className="grid gap-5 rounded-2xl border border-border bg-white/45 p-6 sm:grid-cols-[auto_minmax(0,1fr)]">
                  {entry.image ? (
                    <EditorialImage
                      src={entry.image}
                      alt=""
                      className="aspect-[4/3] min-h-0 w-full rounded-lg border-0 sm:w-52"
                      sizes="208px"
                    />
                  ) : null}

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.type ? <Badge variant="secondary">{entry.type}</Badge> : null}
                      {entry.year ? <Badge variant="outline">{entry.year}</Badge> : null}
                    </div>

                    <h2 className="mt-3 text-2xl leading-tight">{entry.title}</h2>

                    {entry.institution || entry.authors.length > 0 ? (
                      <p className="mt-1.5 text-sm font-semibold text-muted-foreground">
                        {[entry.authors.join(", "), entry.institution].filter(Boolean).join(" — ")}
                      </p>
                    ) : null}

                    {entry.summary ? (
                      <p className="mt-3 max-w-[74ch] text-sm leading-6 text-muted-foreground">
                        {entry.summary}
                      </p>
                    ) : null}

                    {entry.tags.length > 0 ? (
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {entry.tags.map((tag) => (
                          <li key={tag}>
                            <Badge variant="outline">{tag}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {entry.documentUrl || entry.externalUrl ? (
                      <p className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
                        {entry.documentUrl ? (
                          <a
                            href={entry.documentUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-[var(--copper-deep)] underline-offset-4 hover:underline"
                          >
                            {page.sections.documents} →
                          </a>
                        ) : null}
                        {entry.externalUrl ? (
                          <a
                            href={entry.externalUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-[var(--copper-deep)] underline-offset-4 hover:underline"
                          >
                            {page.sections.publications} →
                          </a>
                        ) : null}
                      </p>
                    ) : null}
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-border py-14 text-muted-foreground">{dict.common.empty}</p>
      )}

      <ContactCTA locale={locale} dict={dict} />
    </Container>
  );
}
