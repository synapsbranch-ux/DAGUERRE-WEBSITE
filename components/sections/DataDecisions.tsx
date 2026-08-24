import { Check } from "lucide-react";

import { EditorialImage } from "@/components/motion/EditorialImage";
import { ParallaxImage } from "@/components/motion/ParallaxImage";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { HomeSection } from "@/lib/types";
import { siteAssets } from "@/lib/media/assets";

/** Les textes d’en-tête sont surchargeables depuis le CMS (`HomeSection`). */
export function DataDecisions({ dict, section: cms }: { dict: Dictionary; section?: HomeSection }) {
  const section = dict.home.dataDecisions;

  return (
    <section className="overflow-hidden py-20 sm:py-24 lg:py-32">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1.03fr_.97fr] lg:gap-20">
          <Reveal>
            <p className="eyebrow">{cms?.eyebrow || section.eyebrow}</p>
            <h2 className="mt-5 max-w-[16ch] text-4xl leading-[1.05] sm:text-5xl lg:text-[58px]">
              {cms?.title || section.title}
            </h2>
            <p className="mt-6 max-w-[62ch] text-[15px] leading-7 text-muted-foreground sm:text-base">
              {cms?.lead || section.lead}
            </p>

            <ol className="mt-9 grid gap-3">
              {section.steps.map((step, index) => (
                <li
                  key={step.label}
                  className="grid grid-cols-[42px_1fr] gap-4 rounded-xl border border-border bg-white/45 p-4.5 transition-colors hover:border-[var(--copper)]/55 hover:bg-white/75"
                >
                  <span className="tnum grid size-10 place-items-center rounded-full bg-[var(--navy-900)] text-xs font-bold text-[var(--copper-soft)]">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-base tracking-[-.02em]">{step.label}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-6 flex max-w-[58ch] items-start gap-3 text-sm font-semibold leading-6 text-[var(--navy-800)]">
              <Check className="mt-0.5 size-5 shrink-0 text-[var(--copper-deep)]" aria-hidden="true" />
              {section.result}
            </p>
          </Reveal>

          <Reveal direction="right">
            <ParallaxImage className="relative">
              <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[var(--copper-wash)]" />
              <EditorialImage
                src={cms?.image ?? siteAssets.dataDecisions.image}
                alt={siteAssets.dataDecisions.alt}
                className="aspect-[4/5] min-h-0 rounded-2xl border-0 shadow-[0_24px_70px_rgb(7_19_33_/_0.14)] sm:aspect-[5/4] lg:aspect-[4/5]"
                sizes="(max-width: 1024px) 100vw, 43vw"
                imageClassName="image-zoom"
              />
            </ParallaxImage>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
