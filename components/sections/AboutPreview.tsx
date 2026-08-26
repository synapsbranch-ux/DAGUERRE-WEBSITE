import Link from "next/link";

import { ScrollPortraitWall, type Speaker } from "@/components/ruixen/scroll-portrait-wall";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import {
  driveIdFromUrl,
  isUnconfiguredRemoteImage,
  resolveKnownImageSource,
  siteAssets,
  type ImageSource,
} from "@/lib/media/assets";
import { href } from "@/lib/routes";
import type { HomeSection } from "@/lib/types";

type AboutPreviewProps = {
  locale: Locale;
  dict: Dictionary;
  photo?: ImageSource;
  /** Surcharges d’en-tête pilotées depuis le CMS. */
  section?: HomeSection;
};

/** Portrait du mur, construit à partir d'une source d'image quelconque. */
function speaker(source: ImageSource, name: string, role: string): Speaker {
  const resolved = resolveKnownImageSource(source);

  return {
    name,
    role,
    src: typeof resolved === "string" ? resolved : resolved.src,
    unoptimized: isUnconfiguredRemoteImage(resolved),
  };
}

/**
 * À propos sur l'accueil.
 *
 * Ruixen UI « Scroll Portrait Wall » : les photographies du parcours montent
 * et repartent au fil du défilement pendant que le mot « Parcours » reste
 * fixé au centre, en fondu d'exclusion sur les images. Sous
 * `prefers-reduced-motion`, le mur se pose et ne bouge plus.
 *
 * Le mur est une invitation : le texte reste bref et renvoie à la page
 * complète. La photographie mise en avant au CMS ouvre la série ; les
 * suivantes viennent du manifeste éditorial du dépôt.
 */
export function AboutPreview({ locale, dict, photo, section: cms }: AboutPreviewProps) {
  const about = dict.home.about;

  /* Le portrait d'accueil sert déjà de fond au bandeau : il n'ouvre pas le mur. */
  const cmsPhoto =
    typeof photo === "string" && driveIdFromUrl(photo) === siteAssets.heroExecutive.driveId
      ? undefined
      : photo;

  const journey = about.facts.map((fact) => fact.title);

  const portraits: Speaker[] = [
    speaker(cmsPhoto ?? siteAssets.originalProfessionalPortrait.image, about.photoAlt, journey[0] ?? about.eyebrow),
    speaker(siteAssets.agronomy.image, siteAssets.agronomy.alt, journey[2] ?? about.eyebrow),
    speaker(siteAssets.economics.image, siteAssets.economics.alt, journey[1] ?? about.eyebrow),
    speaker(siteAssets.haitiQuebec.image, siteAssets.haitiQuebec.alt, journey[3] ?? about.eyebrow),
  ];

  return (
    <section id="a-propos" className="scroll-mt-24">
      <ScrollPortraitWall
        title={cms?.eyebrow || about.eyebrow}
        date={about.photoCaption}
        hint={about.cta}
        speakers={portraits}
        columns={4}
        className="bg-[var(--surface-sunken)]"
      />

      <Container className="pb-[var(--band-space)]">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-20">
          <div>
            <h2 className="max-w-[19ch] text-3xl leading-[1.08] sm:text-[48px]">
              {cms?.title || about.statement}
            </h2>
            <Button asChild size="cta" variant="outline" className="mt-8">
              <Link href={href("about", locale)}>{about.cta} →</Link>
            </Button>
          </div>

          <div>
            <div className="max-w-[68ch] space-y-4 text-[15px] leading-7 text-muted-foreground">
              {about.body.map((paragraph) => (
                <p key={paragraph.slice(0, 42)}>{paragraph}</p>
              ))}
            </div>

            <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {about.facts.map((fact) => (
                <div key={fact.title} className="border-t border-border pt-4">
                  <dt className="text-sm font-bold text-[var(--navy-800)]">{fact.title}</dt>
                  <dd className="mt-1 text-xs leading-5 text-muted-foreground">{fact.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
