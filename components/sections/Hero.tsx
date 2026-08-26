import { ArrowDownRight, ArrowRight } from "lucide-react";
import Link from "next/link";

import { LiquidCtaLink } from "@/components/liquefy/LiquidCtaLink";
import {
  DitherImageContent,
  DitherImageFrame,
  DitherImageOverlay,
  DitherImageReveal,
} from "@/components/cult/dither-image";
import ArcRevealHero from "@/components/ruixen/arc-reveal-hero";
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

/**
 * Accueil — bandeau d'ouverture.
 *
 * Structure : Ruixen UI « Arc Reveal Hero ». Le rideau courbe s'ouvre après
 * trois mots — Données · Méthode · Décision — puis découvre le bandeau. Il
 * n'est armé qu'après hydratation et ne rejoue pas dans la même session ;
 * sous `prefers-reduced-motion`, il ne s'affiche pas du tout.
 *
 * Photographie : Cult UI « Dither Image Reveal ». Le portrait est tramé, et
 * un calque propre masqué en diagonale rend sa netteté au visage. Ce motif
 * revient ailleurs sur le site, toujours en petite dose.
 *
 * Le composant reste serveur : seuls le rideau et l'appel à l'action en verre
 * liquide franchissent la frontière client.
 */
export function Hero({ locale, dict, backgroundImage, eyebrow, title, lead }: HeroProps) {
  const hero = dict.home.hero;
  const source = resolveImageSource(backgroundImage, siteAssets.heroExecutive.image);
  const unoptimized = isUnconfiguredRemoteImage(source);

  return (
    <ArcRevealHero
      /*
       * L'en-tête flotte en `sticky`/`fixed` au-dessus du contenu plutôt que
       * de s'y intégrer : il réserve un bandeau de fond de page (72px sous
       * xl — la barre repliée mobile —, 100px à partir de xl — marge +
       * pilule) avant le premier bloc. Ce bandeau serait de la couleur de
       * fond de page (parchemin) et non du bleu nuit de la bannière. La
       * marge négative fait remonter la bannière derrière ; le padding du
       * conteneur ci-dessous compense d'autant pour que le contenu reste à
       * la même hauteur qu'avant.
       */
      className="min-h-0 -mt-[72px] bg-[var(--navy-950)] xl:-mt-[100px]"
      introClassName="bg-[var(--ivory)]"
      greetingClassName="font-heading text-[var(--navy-900)]"
      curtainColor="var(--navy-950)"
      greetings={hero.greetings.map((text) => ({ text }))}
      greetingHold={520}
      revealDuration={1100}
      storageKey="daguerre-hero-intro"
    >
      <section className="relative isolate overflow-hidden bg-[var(--navy-950)] text-white">
        <DitherImageReveal className="absolute inset-0 -z-10">
          <DitherImageFrame
            className="absolute inset-0 size-full"
            size="sm"
            grayscale={0.55}
            contrast={112}
            opacity={0.55}
          >
            <DitherImageContent
              src={source}
              alt={hero.portraitAlt}
              fill
              sizes="100vw"
              quality={75}
              preload
              fetchPriority="high"
              unoptimized={unoptimized}
              className="object-cover object-[72%_center] sm:object-[68%_center] lg:object-center"
            />
          </DitherImageFrame>
          <DitherImageOverlay
            src={source}
            alt=""
            direction="tr-bl"
            from={12}
            to={82}
            fill
            sizes="100vw"
            quality={75}
            unoptimized={unoptimized}
            className="object-cover object-[72%_center] sm:object-[68%_center] lg:object-center"
          />
        </DitherImageReveal>

        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,13,24,.98)_0%,rgba(5,13,24,.90)_35%,rgba(5,13,24,.52)_62%,rgba(5,13,24,.16)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(5,13,24,.74)_0%,transparent_34%)]" />

        <Container className="relative flex min-h-[80svh] flex-col justify-center pb-28 pt-[152px] sm:pb-32 sm:pt-[168px] lg:pb-36 xl:pt-[196px]">
          <div className="max-w-[760px]">
            <p className="eyebrow-light">{eyebrow || hero.eyebrow}</p>
            <h1 className="mt-6 max-w-[13ch] text-[clamp(2.65rem,6.1vw,5.65rem)] leading-[.98] text-white">
              {title || hero.title}
            </h1>
            <p className="mt-7 max-w-[56ch] text-[15px] leading-7 text-white/78 sm:text-lg sm:leading-8">
              {lead || hero.lead}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <LiquidCtaLink
                href={href("contact", locale)}
                size="lg"
                iconAfter={<ArrowRight aria-hidden="true" className="size-4" />}
              >
                {hero.primaryCta}
              </LiquidCtaLink>
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
          </div>
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
    </ArcRevealHero>
  );
}
