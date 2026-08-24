import Link from "next/link";

import { EditorialImage } from "@/components/motion/EditorialImage";
import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { resolveImageSource, siteAssets, type ImageSource } from "@/lib/media/assets";
import { href } from "@/lib/routes";
import type { HomeSection } from "@/lib/types";

type EngagementPreviewProps = {
  locale: Locale;
  dict: Dictionary;
  photo?: ImageSource;
  /** Surcharges d’en-tête pilotées depuis le CMS. */
  section?: HomeSection;
};

export function EngagementPreview({ locale, dict, photo, section: cms }: EngagementPreviewProps) {
  const section = dict.home.engagement;
  const source = resolveImageSource(photo, siteAssets.engagement.image);

  return (
    <section id="engagement" className="scroll-mt-24 bg-[var(--copper-wash)] py-16 sm:py-20">
      <Container>
        <div className="grid overflow-hidden rounded-3xl bg-[var(--navy-850)] text-white shadow-[0_22px_70px_rgb(7_19_33_/_0.13)] lg:grid-cols-[1.06fr_.94fr]">
          <Reveal className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
            <p className="eyebrow-light">{cms?.eyebrow || section.eyebrow}</p>
            <h2 className="mt-5 max-w-[27ch] text-2xl leading-[1.22] text-white sm:text-4xl">
              {cms?.title || section.statement}
            </h2>
            <Button asChild size="cta" variant="band" className="mt-8 w-fit">
              <Link href={href("engagement", locale)}>{section.cta} →</Link>
            </Button>
          </Reveal>

          <Reveal direction="right">
            <EditorialImage
              src={source}
              alt={section.photoAlt}
              className="aspect-[4/3] min-h-0 border-0 lg:h-full lg:min-h-[420px]"
              sizes="(max-width: 1024px) 100vw, 46vw"
              imageClassName="image-zoom"
            />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
