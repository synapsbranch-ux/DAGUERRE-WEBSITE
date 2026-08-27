import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";

import { SignDocument } from "@/components/contracts/SignDocument";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDictionaryFor } from "@/lib/dictionaries";
import { tryConnectToDatabase } from "@/lib/db/client";
import { ContractModel, ContractSignerModel } from "@/lib/db/models/platform";
import { isLocale } from "@/lib/i18n";
import { signerStatusLabels, type SignerStatus } from "@/lib/platform/enums";
import { isContractExpired, isSignerTurn, readSignerToken } from "@/lib/platform/contracts";
import { createMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

type Doc = Record<string, unknown>;

export async function generateMetadata({ params }: PageProps<"/[locale]/signature">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionaryFor(locale);
  return createMetadata({
    locale,
    routeKey: "contractSign",
    title: dict.platform.signature.title,
    description: dict.platform.signature.lead,
    noIndex: true,
  });
}

/**
 * Page de signature d'une partie externe.
 *
 * **Aucune session n'intervient.** Le jeton présent dans l'URL désigne le
 * signataire, et lui seul ; la page ne demande jamais qui vous êtes, parce que
 * la réponse serait déclarative et donc sans valeur.
 *
 * Tous les refus se ressemblent volontairement : lien invalide, jeton révoqué,
 * contrat inexistant ou annulé aboutissent au même écran. Distinguer les cas
 * renseignerait un curieux sur ce qui existe. Les états qui concernent le
 * signataire légitime — déjà signé, tour d'une autre partie, document clos —
 * sont en revanche expliqués : lui a besoin de savoir où il en est.
 */
export default async function SignaturePage({ params, searchParams }: PageProps<"/[locale]/signature">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const query = await searchParams;
  const token = typeof query.jeton === "string" ? query.jeton : "";
  const dict = await getDictionaryFor(locale);
  const t = dict.platform.signature;

  const shell = (title: string, body: string, extra?: string) => (
    <Container>
      <PageHeader eyebrow={t.title} title={title} description={body} />
      {extra ? <p className="max-w-2xl pb-16 text-sm text-muted-foreground">{extra}</p> : <div className="pb-16" />}
    </Container>
  );

  const parsed = readSignerToken(token);
  if (!parsed) return shell(t.invalid, t.invalidHelp);

  if (!(await tryConnectToDatabase())) {
    return shell(t.invalid, dict.platform.common.networkError);
  }

  const signer = (await ContractSignerModel.findById(parsed.signerId).lean()) as Doc | null;
  if (!signer || Number(signer.tokenVersion ?? 1) !== parsed.version) {
    return shell(t.invalid, t.invalidHelp);
  }

  const contract = (await ContractModel.findById(String(signer.contractId ?? "")).lean()) as Doc | null;
  if (!contract || contract.status === "draft") return shell(t.invalid, t.invalidHelp);

  const status = String(signer.status ?? "pending") as SignerStatus;
  const contractStatus = String(contract.status ?? "");
  const title = String(contract.title ?? "");
  const number = String(contract.contractNumber ?? "");

  if (status === "signed") {
    return shell(t.signedTitle, t.alreadySigned, `${number} — ${title}`);
  }
  if (status === "declined") {
    return shell(t.declinedTitle, t.alreadyDeclined, `${number} — ${title}`);
  }

  if (isContractExpired(contract) || !["sent", "partially_signed"].includes(contractStatus)) {
    return shell(t.closedTitle, t.closedBody, `${number} — ${title}`);
  }

  const siblings = (await ContractSignerModel.find({ contractId: String(signer.contractId ?? "") })
    .sort({ order: 1, createdAt: 1 })
    .lean()) as Doc[];

  if (!isSignerTurn(signer, siblings)) {
    return shell(t.title, t.waitTurn, `${number} — ${title}`);
  }

  /*
   * La consultation est datée ici **et** au chargement du document. Les deux
   * sont conditionnels au statut `pending`, donc idempotents : le premier des
   * deux qui arrive fixe la date. Deux points d'entrée, parce que l'affichage
   * du PDF dans un cadre échoue sur certains navigateurs mobiles, et qu'une
   * piste d'audit ne doit pas dépendre d'un greffon.
   */
  if (status === "pending") {
    after(async () => {
      await ContractSignerModel.updateOne(
        { _id: signer._id, status: "pending" },
        { $set: { status: "viewed", viewedAt: new Date() } },
      );
    });
  }

  const others = siblings
    .filter((other) => String(other._id) !== String(signer._id))
    .map((other) => ({
      name: String(other.name ?? ""),
      status: String(other.status ?? "pending") as SignerStatus,
    }));

  return (
    <Container>
      <PageHeader eyebrow={number} title={title} description={t.lead} />

      <div className="grid gap-10 pb-20 lg:grid-cols-[minmax(0,1fr)_300px]">
        <SignDocument
          dict={dict}
          token={token}
          signerName={String(signer.name ?? "")}
          documentUrl={`/api/contracts/document?jeton=${encodeURIComponent(token)}`}
        />

        <aside className="grid h-fit gap-6 rounded-lg border border-border p-5 text-sm">
          {contract.documentHash ? (
            <div className="grid gap-1">
              <h2 className="text-xs text-muted-foreground">{t.fingerprint}</h2>
              <p className="break-all font-mono text-[11px]">{String(contract.documentHash)}</p>
              <p className="text-xs text-muted-foreground">{t.fingerprintHelp}</p>
            </div>
          ) : null}

          {contract.expiresAt instanceof Date ? (
            <div className="grid gap-0.5">
              <h2 className="text-xs text-muted-foreground">{t.expiresOn}</h2>
              <p>{formatDate(contract.expiresAt)}</p>
            </div>
          ) : null}

          {others.length > 0 ? (
            <div className="grid gap-1">
              <h2 className="text-xs text-muted-foreground">{t.otherSigners}</h2>
              <ul className="grid gap-1">
                {others.map((other, index) => (
                  <li key={index} className="flex justify-between gap-3">
                    <span>{other.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {signerStatusLabels[other.status]?.[locale] ?? other.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </Container>
  );
}
