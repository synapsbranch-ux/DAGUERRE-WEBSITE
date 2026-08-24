import { ArrowDownRight, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import {
  isUnconfiguredRemoteImage,
  resolveImageSource,
  siteAssets,
  type ImageSource,
} from "@/lib/media/assets";
import { href } from "@/lib/routes";

type HeroProps = {
  locale: Locale;
  dict: Dictionary;
  backgroundImage?: ImageSource;
  eyebrow?: string;
  title?: string;
  lead?: string;
};

export function Hero({ locale, dict, backgroundImage, eyebrow, title, lead }: HeroProps) {
  const hero = dict.home.hero;
  const source = resolveImageSource(backgroundImage, siteAssets.heroExecutive.image);

  return (
    <section className="relative isolate overflow-hidden bg-[var(--navy-950)] text-white">
      <Image
        src={source}
        alt={hero.portraitAlt}
        fill
        sizes="100vw"
        quality={75}
        preload
        fetchPriority="high"
        unoptimized={isUnconfiguredRemoteImage(source)}
        className="object-cover object-[72%_center] sm:object-[68%_center] lg:object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,13,24,.98)_0%,rgba(5,13,24,.90)_35%,rgba(5,13,24,.52)_62%,rgba(5,13,24,.16)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,13,24,.74)_0%,transparent_34%)]" />

      <Container className="relative flex min-h-[80svh] flex-col justify-center pb-28 pt-20 sm:pb-32 sm:pt-24 lg:pb-36">
        <Reveal className="max-w-[760px]">
          <p className="eyebrow-light">{eyebrow || hero.eyebrow}</p>
          <h1 className="mt-6 max-w-[13ch] text-[clamp(2.65rem,6.1vw,5.65rem)] leading-[.98] text-white">
            {title || hero.title}
          </h1>
          <p className="mt-7 max-w-[56ch] text-[15px] leading-7 text-white/78 sm:text-lg sm:leading-8">
            {lead || hero.lead}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="cta">
              <Link href={href("contact", locale)}>
                {hero.primaryCta} <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="cta" variant="band">
              <Link href={href("services", locale)}>{hero.secondaryCta}</Link>
            </Button>
          </div>

          <Link
            href={href("projects", locale)}
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-white/72 transition-colors hover:text-[var(--copper-soft)] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--copper-soft)]"
          >
            {hero.tertiaryCta} <ArrowDownRight className="size-4" aria-hidden="true" />
          </Link>
        </Reveal>
      </Container>

      <div className="absolute inset-x-0 bottom-0 border-t border-white/12 bg-[var(--navy-950)]/78 backdrop-blur-md">
        <Container className="flex min-h-20 flex-col justify-center gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--copper-soft)]">
            {dict.home.proof.label}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-white/76 sm:justify-end sm:text-sm">
            {dict.home.proof.items.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1 rounded-full bg-[var(--copper)]" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </Container>
      </div>
    </section>
  );
}
