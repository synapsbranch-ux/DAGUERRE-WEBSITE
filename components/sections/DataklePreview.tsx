import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { siteAssets } from "@/lib/media/assets";
import { href } from "@/lib/routes";
import type { HomeSection } from "@/lib/types";

type DataklePreviewProps = {
  locale: Locale;
  dict: Dictionary;
  /** Surcharges d’en-tête pilotées depuis le CMS. */
  section?: HomeSection;
};

export function DataklePreview({ locale, dict, section: cms }: DataklePreviewProps) {
  const section = dict.home.datakle;

  return (
    <section id="datakle" className="relative isolate scroll-mt-20 overflow-hidden bg-[var(--navy-950)] py-20 text-white sm:py-24 lg:py-30">
      <Image
        src={cms?.image ?? siteAssets.datakle.image}
        alt={siteAssets.datakle.alt}
        fill
        sizes="100vw"
        quality={75}
        className="object-cover object-center opacity-34"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,13,24,.97),rgba(7,19,33,.79)_55%,rgba(7,19,33,.68))]" />

      <Container className="relative">
        <div className="grid items-start gap-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-18">
          <Reveal>
            <p className="eyebrow-light">{cms?.eyebrow || section.eyebrow}</p>
            <h2 className="mt-5 text-5xl leading-none text-white sm:text-6xl">{cms?.title || section.title}</h2>
            <p className="mt-6 max-w-[54ch] text-[15px] leading-7 text-white/72 sm:text-base">
              {cms?.lead || section.lead}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="cta">
                <Link href={href("contact", locale)}>
                  {section.primaryCta} <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="cta" variant="band">
                <Link href={href("services", locale)}>{section.secondaryCta}</Link>
              </Button>
            </div>
          </Reveal>

          <ul className="grid gap-3 sm:grid-cols-2">
            {section.services.map((service, index) => (
              <li key={service.title}>
                <Reveal delay={index * 70} className="h-full">
                  <div className="glass-panel h-full rounded-2xl p-6 transition-[transform,border-color,background-color] hover:-translate-y-1 hover:border-[var(--copper)]/55 hover:bg-[var(--navy-800)]/82">
                    <span className="tnum text-xs font-bold text-[var(--copper-soft)]">0{index + 1}</span>
                    <h3 className="mt-8 text-xl text-white">{service.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/64">{service.detail}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
