import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import type { HomeSection } from "@/lib/types";

/**
 * Bande d'inscription à l'infolettre sur l'accueil.
 *
 * Comme toutes les bandes de l'accueil, elle lit ses textes dans le CMS quand
 * la section est renseignée, et retombe sinon sur le dictionnaire. Elle se
 * masque et se réordonne depuis l'écran « Accueil » du tableau de bord.
 */
export function NewsletterPreview({
  locale,
  dict,
  section,
}: {
  locale: Locale;
  dict: Dictionary;
  section?: HomeSection;
}) {
  const t = dict.platform.newsletter;

  return (
    <section className="border-t border-border py-16 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow">| {section?.eyebrow || t.title} |</p>
            <h2 className="mt-4 max-w-[20ch] font-heading text-3xl leading-[1.1] sm:text-[40px]">
              {section?.title || t.lead}
            </h2>
            {section?.lead ? (
              <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
                {section.lead}
              </p>
            ) : null}
          </div>

          <div className="max-w-xl lg:justify-self-end">
            <NewsletterSignup dict={dict} locale={locale} source="homepage" />
          </div>
        </div>
      </Container>
    </section>
  );
}
