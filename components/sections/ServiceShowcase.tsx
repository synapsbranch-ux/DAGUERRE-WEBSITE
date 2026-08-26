import { FeatureCarousel } from "@/components/cult/feature-carousel";
import { resolveKnownImageSource } from "@/lib/media/assets";
import type { Service } from "@/lib/types";

type ServiceShowcaseProps = {
  services: Service[];
  title: string;
  description: string;
  alt: string;
};

/**
 * Vitrine des services — Cult UI « Feature Carousel ».
 *
 * Le composant enchaîne quatre mises en page, chacune avec son propre jeu de
 * visuels. Il ne s'affiche donc que si le CMS fournit **quatre services munis
 * d'une image** : à défaut, la page s'en tient au registre des services, qui
 * lui n'a besoin que de texte. Rien n'est comblé par une image d'illustration.
 */
export function ServiceShowcase({ services, title, description, alt }: ServiceShowcaseProps) {
  const illustrated = services
    .map((service) => ({
      service,
      image: service.image ? resolveKnownImageSource(service.image) : null,
    }))
    .filter((entry): entry is { service: Service; image: NonNullable<typeof entry.image> } =>
      entry.image !== null,
    )
    .slice(0, 4);

  if (illustrated.length < 4) return null;

  const [one, two, three, four] = illustrated;

  return (
    <FeatureCarousel
      title={title}
      description={description}
      steps={illustrated.map((entry, index) => ({
        id: entry.service.slug,
        name: String(index + 1).padStart(2, "0"),
        title: entry.service.title,
        description: entry.service.summary,
      }))}
      image={{
        alt,
        step1light1: one.image,
        step1light2: two.image,
        step2light1: two.image,
        step2light2: three.image,
        step3light: three.image,
        step4light: four.image,
      }}
    />
  );
}
