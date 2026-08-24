import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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
      <Button
        asChild
        size="cta"
        className="border-[var(--navy-950)] bg-[var(--navy-950)] text-white hover:border-[var(--navy-800)] hover:bg-[var(--navy-800)]"
      >
        <Link href={href("contact", locale)}>
          {dict.common.contactCta} <ArrowUpRight aria-hidden="true" />
        </Link>
      </Button>
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
