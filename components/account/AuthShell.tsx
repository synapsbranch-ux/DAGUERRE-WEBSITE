import type { ReactNode } from "react";
import Link from "next/link";

import { Container } from "@/components/ui/Container";

/**
 * Cadre commun des pages de compte.
 *
 * Connexion, inscription et récupération de mot de passe partagent la même
 * colonne étroite centrée : trois mises en page différentes pour trois écrans
 * du même parcours donneraient l'impression de changer de site en cours de
 * route.
 */
export function AuthShell({
  eyebrow,
  title,
  lead,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Container>
      <div className="mx-auto flex w-full max-w-md flex-col items-center py-16 sm:py-24">
        <header className="w-full">
          <p className="eyebrow">| {eyebrow} |</p>
          <h1 className="mt-4 font-heading text-4xl leading-[1.05]">{title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{lead}</p>
        </header>

        <div className="mt-9 flex w-full justify-center">{children}</div>

        {footer ? <div className="mt-8 w-full text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </Container>
  );
}

/** Lien de bas de formulaire : « Pas encore de compte ? Créer un compte ». */
export function AuthFooterLink({ label, href, cta }: { label: string; href: string; cta: string }) {
  return (
    <p>
      {label}{" "}
      <Link href={href} className="font-medium text-foreground underline underline-offset-4">
        {cta}
      </Link>
    </p>
  );
}
