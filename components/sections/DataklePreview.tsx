import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ServiceLedger, type ServiceEntry } from "@/components/ruixen/service-ledger";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { isUnconfiguredRemoteImage, resolveKnownImageSource, siteAssets } from "@/lib/media/assets";
import { href } from "@/lib/routes";
import type { HomeSection, Service } from "@/lib/types";

type DataklePreviewProps = {
  locale: Locale;
  dict: Dictionary;
  /** Services publiés au CMS. Vide tant que la collection n'est pas remplie. */
  services: Service[];
  /** Surcharges d’en-tête pilotées depuis le CMS. */
  section?: HomeSection;
};

/**
 * Convertit un service du CMS en entrée de registre.
 *
 * Le code `S01…` est dérivé du rang : il numérote l'offre sans rien inventer.
 */
export function toServiceEntry(service: Service, index: number, locale: Locale): ServiceEntry {
  const image = service.image ? resolveKnownImageSource(service.image) : undefined;

  return {
    code: `S${String(index + 1).padStart(2, "0")}`,
    title: service.title,
    description: service.summary,
    items: service.deliverables.length ? service.deliverables : service.features,
    image: image ? (typeof image === "string" ? image : image.src) : undefined,
    unoptimizedImage: image ? isUnconfiguredRemoteImage(image) : undefined,
    cta: { href: href("services", locale, service.slug), label: service.title },
  };
}

/**
 * Datakle sur l'accueil.
 *
 * Ruixen UI « Service Ledger » : une bande d'onglets collante suit la lecture
 * et chaque service déroule son résumé et ses livrables. Les entrées viennent
 * de la collection `Service` ; tant qu'elle est vide, la maquette de référence
 * du dictionnaire tient lieu de sommaire — aucun service n'est inventé, et un
 * service retiré du CMS disparaît d'ici comme de la page Services.
 */
export function DataklePreview({ locale, dict, services, section: cms }: DataklePreviewProps) {
  const section = dict.home.datakle;

  const entries: ServiceEntry[] = services.length
    ? services.map((service, index) => toServiceEntry(service, index, locale))
    : section.services.map((service, index) => ({
        code: `S${String(index + 1).padStart(2, "0")}`,
        title: service.title,
        description: service.detail,
      }));

  return (
    <section
      id="datakle"
      className="relative isolate scroll-mt-20 overflow-hidden bg-[var(--navy-950)] py-[var(--band-space)] text-white"
      style={{ ["--ledger-sticky-top" as string]: "76px" }}
    >
      <Image
        src={cms?.image ?? siteAssets.datakle.image}
        alt=""
        fill
        sizes="100vw"
        quality={75}
        className="object-cover object-center opacity-30"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,13,24,.97),rgba(7,19,33,.86)_55%,rgba(7,19,33,.78))]" />

      <Container className="relative">
        <div className="max-w-[62ch]">
          <p className="eyebrow-light">{cms?.eyebrow || section.eyebrow}</p>
          <h2 className="mt-5 text-5xl leading-none text-white sm:text-6xl">
            {cms?.title || section.title}
          </h2>
          <p className="mt-6 text-[15px] leading-7 text-white/72 sm:text-base">
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
        </div>

        <ServiceLedger
          entries={entries}
          showHeader={false}
          navLabel={dict.pages.datakle.sections.services}
          className="py-0"
          frameClassName="max-w-none px-0 sm:px-0"
          contentClassName="max-w-none"
          stripClassName="bg-[var(--navy-950)]/85"
        />
      </Container>
    </section>
  );
}
