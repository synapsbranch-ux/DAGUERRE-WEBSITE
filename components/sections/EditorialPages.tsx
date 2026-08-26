import { FileQuestion } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { EditorialImage } from "@/components/motion/EditorialImage";
import {
  DitherImageContent,
  DitherImageFrame,
  DitherImageOverlay,
  DitherImageReveal,
} from "@/components/cult/dither-image";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { isUnconfiguredRemoteImage, resolveKnownImageSource } from "@/lib/media/assets";
import type {
  PageCertification,
  PageEntry,
  PageItem,
  PageSection,
  PageTimelineEntry,
} from "@/lib/types";

/**
 * Blocs d'affichage des pages éditoriales.
 *
 * Ces composants sont **purement présentationnels** : tout leur contenu vient
 * du CMS (`getPage`). Ils ne connaissent ni texte par défaut ni illustration
 * codée en dur — un bloc sans données ne se rend simplement pas.
 */

/** Corps de page en Markdown. Le HTML brut n'est jamais interprété. */
export function EditorialBody({ body, className }: { body?: string; className?: string }) {
  if (!body?.trim()) return null;
  return (
    <div className={className ?? "prose max-w-3xl text-foreground"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {body}
      </ReactMarkdown>
    </div>
  );
}

/** Frise chronologique : période, intitulé, détail, illustration facultative. */
export function EditorialTimeline({ title, entries }: { title: string; entries: PageTimelineEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="border-t border-border py-14">
      <h2 className="text-3xl">{title}</h2>
      <ol className="mt-8 grid gap-4">
        {entries.map((entry, index) => (
          <li key={`${entry.title}-${index}`}>
            <Reveal delay={index * 60}>
              <article className="grid gap-4 rounded-xl border border-border bg-white/45 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div>
                  {entry.period ? (
                    <p className="tnum text-xs font-bold uppercase tracking-[.14em] text-[var(--copper-deep)]">
                      {entry.period}
                    </p>
                  ) : null}
                  <h3 className="mt-2 text-xl">{entry.title}</h3>
                  {entry.detail ? (
                    <p className="mt-2 max-w-[70ch] text-sm leading-6 text-muted-foreground">
                      {entry.detail}
                    </p>
                  ) : null}
                </div>
                {entry.image ? (
                  <EditorialImage
                    src={entry.image}
                    alt=""
                    className="aspect-[4/3] min-h-0 w-full rounded-lg border-0 sm:w-44"
                    sizes="176px"
                  />
                ) : null}
              </article>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Sections illustrées : un bloc texte + image, alternés. */
/**
 * Ancre stable d'une section éditoriale.
 *
 * Le rail de chapitres (Ruixen « Chapter Scrubber ») s'y rend : les deux
 * doivent dériver l'identifiant de la même façon.
 */
export function sectionAnchorId(title: string, index: number): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? `section-${slug}` : `section-${index + 1}`;
}

export function EditorialSections({ sections }: { sections: PageSection[] }) {
  if (sections.length === 0) return null;

  return (
    <div className="divide-y divide-border">
      {sections.map((section, index) => (
        <section
          key={`${section.title}-${index}`}
          id={sectionAnchorId(section.title, index)}
          className="scroll-mt-28 py-14"
        >
          <div
            className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
              index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
            }`}
          >
            <Reveal>
              <h2 className="text-3xl leading-tight sm:text-4xl">{section.title}</h2>
              <EditorialBody
                body={section.body}
                className="prose mt-5 max-w-[62ch] text-[15px] leading-7 text-muted-foreground"
              />
            </Reveal>
            {section.image ? (
              <Reveal direction="right">
                <EditorialImage
                  src={section.image}
                  alt=""
                  className="aspect-[4/3] min-h-0 rounded-2xl border-0"
                  sizes="(max-width: 1024px) 100vw, 46vw"
                />
              </Reveal>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Liste illustrée : valeurs, initiatives, projets marquants. */
export function EditorialItems({
  title,
  items,
  dark = false,
}: {
  title: string;
  items: PageItem[];
  dark?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section className={dark ? "py-14" : "border-t border-border py-14"}>
      <h2 className={`text-3xl ${dark ? "text-white" : ""}`}>{title}</h2>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <li key={`${item.title}-${index}`}>
            <Reveal delay={index * 60} className="h-full">
              <article
                className={`flex h-full flex-col rounded-2xl border p-5 ${
                  dark ? "border-white/12 bg-white/5 text-white" : "border-border bg-white/45"
                }`}
              >
                {item.image ? (
                  <EditorialImage
                    src={item.image}
                    alt=""
                    className="mb-4 aspect-[16/9] min-h-0 rounded-lg border-0"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                ) : null}
                <h3 className="text-lg">{item.title}</h3>
                {item.detail ? (
                  <p className={`mt-2 flex-1 text-sm leading-6 ${dark ? "text-white/68" : "text-muted-foreground"}`}>
                    {item.detail}
                  </p>
                ) : null}
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-4 text-sm font-semibold text-[var(--copper-deep)] underline-offset-4 hover:underline"
                  >
                    En savoir plus →
                  </a>
                ) : null}
              </article>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Parcours : postes ou diplômes, organisation et période. */
export function EditorialEntries({ title, entries }: { title: string; entries: PageEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="border-t border-border py-14">
      <h2 className="text-3xl">{title}</h2>
      <ol className="mt-8 grid gap-6">
        {entries.map((entry, index) => (
          <li key={`${entry.title}-${index}`} className="border-l-2 border-[var(--copper)]/40 pl-5">
            <h3 className="text-xl">{entry.title}</h3>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {[entry.organisation, entry.period].filter(Boolean).join(" · ")}
            </p>
            {entry.detail ? (
              <p className="mt-2 max-w-[74ch] text-sm leading-6 text-muted-foreground">{entry.detail}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function EditorialCertifications({
  title,
  certifications,
}: {
  title: string;
  certifications: PageCertification[];
}) {
  if (certifications.length === 0) return null;

  return (
    <section className="border-t border-border py-14">
      <h2 className="text-3xl">{title}</h2>
      <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {certifications.map((certification, index) => (
          <li key={`${certification.name}-${index}`} className="rounded-lg border border-border bg-white/45 p-4">
            <p className="text-sm font-semibold">{certification.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[certification.issuer, certification.year].filter(Boolean).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Galerie d'images de fin de page. */
export function EditorialGallery({ title, images }: { title: string; images: string[] }) {
  if (images.length === 0) return null;

  return (
    <section className="border-t border-border py-14">
      <h2 className="sr-only">{title}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image) => (
          <li key={image}>
            <EditorialImage
              src={image}
              alt=""
              className="aspect-[4/3] min-h-0 rounded-xl border-0"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * En-tête d'une page éditoriale, entièrement issu du CMS.
 *
 * Sans page enregistrée, l'appelant affiche son propre état vide : ce
 * composant ne fabrique jamais de contenu de remplacement.
 */
/**
 * En-tête d'une page éditoriale.
 *
 * `dithered` fait passer la photographie d'ouverture par Cult UI
 * « Dither Image Reveal » : le tramage tient la moitié droite du cadre et la
 * photographie reste nette là où le regard se pose. Réservé aux ouvertures —
 * appliqué partout, le motif cesserait d'être une signature.
 */
export function EditorialHeader({
  eyebrow,
  title,
  subtitle,
  image,
  dithered = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  image?: string;
  dithered?: boolean;
}) {
  return (
    <header className="py-14">
      <Container className="px-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-5 max-w-[20ch] text-4xl leading-[1.05] sm:text-6xl">{title}</h1>
        {subtitle ? (
          <p className="mt-6 max-w-[62ch] text-lg leading-8 text-muted-foreground">{subtitle}</p>
        ) : null}
        {image ? (
          dithered ? (
            <DitheredHeaderImage src={image} />
          ) : (
            <EditorialImage
              src={image}
              alt=""
              className="mt-10 aspect-[21/9] min-h-0 rounded-2xl border-0"
              sizes="(max-width: 1024px) 100vw, 1180px"
              priority
            />
          )
        ) : null}
      </Container>
    </header>
  );
}

/** État vide honnête d'une page dont le contenu n'a pas encore été saisi. */
/**
 * État vide d'une page éditoriale dont le contenu n'a pas encore été saisi.
 *
 * shadcn `Empty` : le titre reste un vrai `<h1>` (c'est la page), le reste
 * suit le registre.
 */
export function EditorialEmpty({ title, message }: { title: string; message: string }) {
  return (
    <Empty className="py-20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileQuestion aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>
          <h1 className="text-4xl font-heading">{title}</h1>
        </EmptyTitle>
        <EmptyDescription className="max-w-[60ch]">{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/** Photographie d'ouverture tramée — Cult UI « Dither Image Reveal ». */
function DitheredHeaderImage({ src }: { src: string }) {
  const source = resolveKnownImageSource(src);
  const unoptimized = isUnconfiguredRemoteImage(source);

  return (
    <DitherImageReveal className="mt-10 aspect-[21/9] w-full overflow-hidden rounded-2xl">
      <DitherImageFrame
        className="absolute inset-0 size-full"
        size="sm"
        grayscale={0.6}
        contrast={114}
        opacity={0.5}
      >
        <DitherImageContent
          src={source}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 1180px"
          quality={75}
          unoptimized={unoptimized}
          className="object-cover"
          preload
        />
      </DitherImageFrame>
      <DitherImageOverlay
        src={source}
        alt=""
        direction="r"
        from={8}
        to={72}
        fill
        sizes="(max-width: 1024px) 100vw, 1180px"
        quality={75}
        unoptimized={unoptimized}
        className="object-cover"
      />
    </DitherImageReveal>
  );
}
