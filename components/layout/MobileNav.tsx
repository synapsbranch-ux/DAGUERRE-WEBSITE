import { Menu, X } from "lucide-react";
import Link from "next/link";

import { legalNavKeys, mainNavKeys, secondaryNavKeys } from "@/components/layout/Navigation";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href, routes, type RouteKey } from "@/lib/routes";

type MobileNavProps = {
  locale: Locale;
  dict: Dictionary;
};

/** Menu mobile natif : clavier et ouverture fonctionnent sans JavaScript. */
export function MobileNav({ locale, dict }: MobileNavProps) {
  const groups: { keys: RouteKey[]; heading?: string }[] = [
    { keys: mainNavKeys },
    { keys: secondaryNavKeys, heading: dict.footer.resources },
    { keys: legalNavKeys, heading: dict.footer.legal },
  ];

  return (
    <details className="group relative lg:hidden">
      <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-full border border-white/20 bg-white/6 text-white transition-colors hover:bg-white/12 focus-visible:ring-3 focus-visible:ring-[var(--copper)]/45 [&::-webkit-details-marker]:hidden">
        <span className="sr-only">{dict.common.menu}</span>
        <Menu className="size-4 group-open:hidden" aria-hidden="true" />
        <X className="hidden size-4 group-open:block" aria-hidden="true" />
      </summary>

      <div className="fixed inset-x-0 bottom-0 top-[72px] overflow-y-auto border-t border-white/10 bg-[var(--navy-950)] px-5 pb-10 pt-5 shadow-2xl sm:left-auto sm:w-[360px]">
        <nav aria-label={dict.common.mainNav}>
          {groups.map((group, index) => (
            <div key={group.heading ?? "main"} className={index > 0 ? "mt-7" : undefined}>
              {group.heading ? (
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--copper-soft)]">
                  {group.heading}
                </p>
              ) : null}
              <ul className={group.heading ? "space-y-1 text-sm" : "space-y-1 text-xl"}>
                {group.keys.map((key) => (
                  <li key={key}>
                    <Link
                      href={href(key, locale)}
                      className="block rounded-lg px-3 py-2 font-heading font-semibold text-white/78 transition-colors hover:bg-white/7 hover:text-white"
                    >
                      {routes[key].label[locale]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <Link
            href={href("contact", locale)}
            className="mt-8 flex h-12 items-center justify-center rounded-full bg-[var(--copper)] px-6 text-sm font-bold text-[var(--navy-950)]"
          >
            {dict.common.contactCta}
          </Link>
        </nav>
      </div>
    </details>
  );
}
