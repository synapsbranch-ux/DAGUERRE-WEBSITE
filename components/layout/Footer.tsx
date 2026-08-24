import Link from "next/link";

import { legalNavKeys, mainNavKeys, secondaryNavKeys } from "@/components/layout/Navigation";
import { Container } from "@/components/ui/Container";
import { getSiteSettings, getSocialLinks } from "@/lib/content";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { href, routes, type RouteKey } from "@/lib/routes";
import { organization, siteConfig } from "@/lib/site";

type FooterProps = {
  locale: Locale;
  dict: Dictionary;
};

export async function Footer({ locale, dict }: FooterProps) {
  const year = new Date().getFullYear();
  const [managedLinks, settings] = await Promise.all([getSocialLinks(), getSiteSettings(locale)]);
  const email = typeof settings?.email === "string" && settings.email && !settings.email.includes("example.com") ? settings.email : null;
  const phone = typeof settings?.phone === "string" && settings.phone ? settings.phone : null;
  const footerNav = mainNavKeys.filter((key) => key !== "services");
  const resources = secondaryNavKeys.slice(0, 4);

  return (
    <footer className="mt-auto bg-[var(--navy-950)] text-white">
      <Container>
        <div className="grid gap-10 border-b border-white/10 py-14 sm:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.8fr_1fr] lg:py-18">
          <div>
            <Link href={href("home", locale)} className="font-heading text-2xl font-semibold tracking-[-.04em]">
              {siteConfig.name}
            </Link>
              <p className="mt-4 max-w-[34ch] text-sm leading-6 text-white/66">
              {locale === "fr"
                ? "Des données structurées, des décisions plus claires et des équipes plus autonomes."
                : "Structured data, clearer decisions and more autonomous teams."}
            </p>
            <p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[var(--copper-soft)]">
              {organization.name} · {locale === "fr" ? "Services analytiques" : "Analytics services"}
            </p>
          </div>

          <FooterLinks title={dict.footer.navigation} locale={locale} keys={footerNav} />
          <FooterLinks title={dict.footer.resources} locale={locale} keys={resources} />

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/55">{dict.footer.presence}</p>
            <div className="mt-4 flex flex-col items-start gap-2.5 text-sm text-white/68">
              <Link href={href("contact", locale)} className="hover:text-[var(--copper-soft)]">{dict.common.contactCta}</Link>
              {email ? <a href={`mailto:${email}`} className="hover:text-[var(--copper-soft)]">{email}</a> : null}
              {phone ? <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-[var(--copper-soft)]">{phone}</a> : null}
              {managedLinks.slice(0, 4).map((link) => (
                <a key={link.id} href={link.url} target="_blank" rel="noreferrer noopener" className="hover:text-[var(--copper-soft)]">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 py-6 text-[11px] text-white/55">
          <span className="mr-auto">© {year} {siteConfig.name} · {dict.footer.rights}</span>
          {legalNavKeys.map((key) => (
            <Link key={key} href={href(key, locale)} className="hover:text-white">
              {routes[key].label[locale]}
            </Link>
          ))}
        </div>
      </Container>
    </footer>
  );
}

function FooterLinks({ title, locale, keys }: { title: string; locale: Locale; keys: RouteKey[] }) {
  return (
    <nav aria-label={title}>
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/55">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm text-white/68">
        {keys.map((key) => (
          <li key={key}>
            <Link href={href(key, locale)} className="transition-colors hover:text-[var(--copper-soft)]">
              {routes[key].label[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
