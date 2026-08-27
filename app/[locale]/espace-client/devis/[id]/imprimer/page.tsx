import { notFound } from "next/navigation";

import { PrintButton } from "@/components/quotes/PrintButton";
import { ProposalView } from "@/components/quotes/ProposalView";
import { getDictionaryFor } from "@/lib/dictionaries";
import { validObjectId } from "@/lib/http";
import { isLocale } from "@/lib/i18n";
import { requirePortal } from "@/lib/platform/portal";
import { findClientQuote, listClientProposals } from "@/lib/platform/queries";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Version imprimable d'une proposition.
 *
 * Le PDF est produit par le navigateur — « Enregistrer en PDF » depuis la
 * boîte d'impression. Un moteur sans interface (Puppeteer, Playwright)
 * ajouterait quelque trois cents mégaoctets de dépendances et un binaire
 * Chromium au déploiement pour un document que le navigateur compose déjà
 * correctement. Si un PDF signé ou archivé devient nécessaire, ce sera un
 * ajout assumé, pas un effet de bord.
 *
 * La page passe par **la même garde d'appartenance** que le suivi du dossier :
 * `findClientQuote` porte la condition dans la requête, et `listClientProposals`
 * ne rend jamais un brouillon. Une adresse devinée ne donne accès à rien.
 */
export default async function ProposalPrintPage({
  params,
}: PageProps<"/[locale]/espace-client/devis/[id]/imprimer">) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !validObjectId(id)) notFound();

  const [dict, portal] = await Promise.all([getDictionaryFor(locale), requirePortal(locale)]);

  const quote = await findClientQuote(portal.session.user.id, id);
  if (!quote) notFound();

  const proposals = await listClientProposals(id);
  // La version courante est la dernière transmise.
  const proposal = proposals[proposals.length - 1];
  if (!proposal) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 print:max-w-none print:px-0 print:py-0">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{quote.quoteNumber}</p>
          <h1 className="mt-1 font-heading text-2xl">{quote.title}</h1>
        </div>
        {/* Masqué à l'impression : un bouton n'a rien à faire sur le papier. */}
        <PrintButton label={dict.platform.quotes.print} className="print:hidden" />
      </header>

      <ProposalView proposal={proposal} dict={dict} locale={locale} />
    </main>
  );
}
