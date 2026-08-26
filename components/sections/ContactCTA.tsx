import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { LiquidCtaLink } from "@/components/liquefy/LiquidCtaLink";
import { Container } from "@/components/ui/Container";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/routes";
import { cn } from "@/lib/utils";

type ContactCTAProps = {
  locale: Locale;
  dict: Dictionary;
  fullBleed?: boolean;
};

/**
 * Appel à l'action de fin de page.
 *
 * Le bouton est celui de Liquefy — le même verre liquide que dans l'en-tête —
 * rendu en lien pour conserver le préchargement Next (voir `LiquidCtaLink`).
 */
export function ContactCTA({ locale, dict, fullBleed = false }: ContactCTAProps) {
  const content = (
    <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[.19em]">
          {dict.pages.contact.eyebrow}
        </p>
        <h2 className="mt-4 max-w-[19ch] text-4xl leading-[1.04] sm:text-[56px]">
          {dict.pages.contact.title}
        </h2>
        <p
          className={cn(
            "mt-5 max-w-[58ch] text-[15px] font-medium leading-7",
            fullBleed ? "text-[var(--navy-950)]" : "text-muted-foreground",
          )}
        >
          {dict.pages.contact.description}
        </p>
      </div>
      {/*
        Deux issues, pas une seule : « parler du projet » pour une prise de
        contact ouverte, « demander un devis » pour qui sait déjà ce qu'il
        veut. Sans le second, un prospect prêt à cadrer son besoin repartait
        vers un formulaire de contact générique.
      */}
      <div className="flex flex-wrap items-center gap-4">
        <LiquidCtaLink
          href={href("contact", locale)}
          size="lg"
          tint={fullBleed ? "#07131f" : undefined}
          iconAfter={<ArrowUpRight aria-hidden="true" className="size-4" />}
        >
          {dict.common.contactCta}
        </LiquidCtaLink>
        <Link
          href={href("quote", locale)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-5 py-3 text-sm font-medium transition-colors",
            fullBleed
              ? "border-[var(--navy-950)]/35 text-[var(--navy-950)] hover:bg-[var(--navy-950)]/8"
              : "border-border hover:bg-foreground/5",
          )}
        >
          {dict.platform.quotes.title}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </div>
  );

  return (
    <section
      id="contact"
      className={cn(
        "scroll-mt-24 py-14 sm:py-20",
        fullBleed ? "bg-[var(--copper)] text-[var(--navy-950)]" : "border-t border-border",
      )}
    >
      {fullBleed ? <Container>{content}</Container> : content}
    </section>
  );
}
