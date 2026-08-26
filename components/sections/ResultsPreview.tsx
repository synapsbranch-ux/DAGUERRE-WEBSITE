import { SplitHeroSection } from "@/components/ruixen/split-hero-section";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import type { HomeSection, SiteSettings } from "@/lib/types";

type ResultsPreviewProps = {
  locale: Locale;
  dict: Dictionary;
  settings: SiteSettings | null;
  section?: HomeSection;
};

/**
 * Résultats sur l'accueil.
 *
 * Ruixen UI « Split Hero Section », dont la colonne de droite — une maquette
 * d'interface factice — est désactivée : la bande ne montre que des chiffres
 * réels.
 *
 * Ces chiffres viennent **uniquement** du CMS (`SiteSettings.stats`). Tant
 * qu'aucun n'est saisi, la bande n'est pas rendue : aucun indicateur n'est
 * inventé, ni arrondi, ni illustré par un graphique sans données.
 */
export function ResultsPreview({ locale, dict, settings, section: cms }: ResultsPreviewProps) {
  const stats = settings?.stats ?? [];
  if (stats.length === 0) return null;

  return (
    <section id="resultats" className="scroll-mt-24 border-y border-border bg-[var(--surface)] py-[var(--band-space)]">
      <Container>
        {cms?.eyebrow ? <p className="eyebrow mb-6">{cms.eyebrow}</p> : null}
        <SplitHeroSection
          as="h2"
          showcase={false}
          title={cms?.title || dict.home.proof.label}
          description={cms?.lead}
          primaryAction={{ href: href("projects", locale), label: dict.common.allProjects }}
          stats={stats.map((stat) => ({ value: stat.value, label: stat.label }))}
          className="bg-transparent"
          innerClassName="max-w-none px-0 lg:max-w-none"
        />
      </Container>
    </section>
  );
}
