import Link from "next/link";

import { EditorialImage } from "@/components/motion/EditorialImage";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { driveIdFromUrl, resolveImageSource, siteAssets, type ImageSource } from "@/lib/media/assets";
import { href } from "@/lib/routes";
import type { HomeSection } from "@/lib/types";

type AboutPreviewProps = {
  locale: Locale;
  dict: Dictionary;
  photo?: ImageSource;
  /** Surcharges d’en-tête pilotées depuis le CMS. */
  section?: HomeSection;
};

export function AboutPreview({ locale, dict, photo, section: cms }: AboutPreviewProps) {
  const about = dict.home.about;
  const cmsPhoto =
    typeof photo === "string" && driveIdFromUrl(photo) === siteAssets.heroExecutive.driveId
      ? undefined
      : photo;
  const source = resolveImageSource(cmsPhoto, siteAssets.originalProfessionalPortrait.image);

  return (
    <section id="a-propos" className="scroll-mt-24 py-20 sm:py-24 lg:py-30">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-20">
          <Reveal direction="left">
            <div className="relative">
              <div className="absolute -bottom-5 -left-5 h-28 w-28 rounded-2xl bg-[var(--copper)]/16" />
              <EditorialImage
                src={source}
                alt={about.photoAlt}
                className="aspect-[4/5] min-h-0 rounded-2xl border-0 shadow-[0_22px_65px_rgb(7_19_33_/_0.13)]"
                sizes="(max-width: 1024px) 100vw, 38vw"
                imageClassName="image-zoom"
              />
              <p className="relative mt-4 text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
                {about.photoCaption}
              </p>
            </div>
          </Reveal>

          <Reveal>
            <p className="eyebrow">{cms?.eyebrow || about.eyebrow}</p>
            <h2 className="mt-5 max-w-[19ch] text-3xl leading-[1.08] sm:text-[48px]">
              {cms?.title || about.statement}
            </h2>

            <div className="mt-7 max-w-[68ch] space-y-4 text-[15px] leading-7 text-muted-foreground">
              {about.body.map((paragraph) => (
                <p key={paragraph.slice(0, 42)}>{paragraph}</p>
              ))}
            </div>

            <dl className="mt-8 grid gap-3 sm:grid-cols-2">
              {about.facts.map((fact) => (
                <div key={fact.title} className="rounded-xl border border-border bg-white/45 p-4">
                  <dt className="text-sm font-bold text-[var(--navy-800)]">{fact.title}</dt>
                  <dd className="mt-1 text-xs leading-5 text-muted-foreground">{fact.detail}</dd>
                </div>
              ))}
            </dl>

            <Button asChild size="cta" variant="outline" className="mt-8">
              <Link href={href("about", locale)}>{about.cta} →</Link>
            </Button>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
