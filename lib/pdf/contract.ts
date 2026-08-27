import { createHash } from "node:crypto";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { Locale } from "@/lib/i18n";
import { checkSignaturePng } from "@/lib/pdf/png";
import {
  CONTENT_WIDTH,
  MARGIN,
  MUTED,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  RULE,
  createDocument,
  finish,
  gap,
  heading,
  paginate,
  rule,
  sanitize,
  text,
  wrap,
} from "@/lib/pdf/layout";

/**
 * Contrats et scellement des signatures.
 *
 * ## Ce que cette signature est, et ce qu'elle n'est pas
 *
 * C'est une **signature électronique simple** : une intention manifestée par
 * une personne identifiée par son adresse de courriel, horodatée, et rattachée
 * à un document dont l'empreinte est figée. Elle est recevable au Québec
 * (LCCJTI) et en Europe (eIDAS, niveau « simple ») pour un contrat commercial
 * ordinaire.
 *
 * Ce n'est **pas** une signature avancée ou qualifiée : aucun certificat émis
 * par un prestataire de services de confiance n'intervient, et le PDF ne porte
 * pas de signature cryptographique au sens de la norme PAdES. Ce que le
 * document prouve, c'est la cohérence d'une piste d'audit — pas l'identité
 * certifiée d'un signataire.
 *
 * ## Pourquoi une empreinte
 *
 * L'empreinte SHA-256 du document **présenté** est calculée à l'envoi et
 * conservée. Elle permet de démontrer, plus tard, que le document scellé dérive
 * bien de celui que les parties ont lu — un contrat modifié après signature
 * produirait une empreinte différente.
 */

/** Empreinte hexadécimale d'un document. */
export function documentHash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const T = {
  fr: {
    contract: "CONTRAT",
    audit: "Piste d'audit de signature",
    auditLead:
      "Ce document a été signé électroniquement. Les éléments ci-dessous constituent la piste d'audit conservée par l'émetteur.",
    documentRef: "Référence du document",
    fingerprint: "Empreinte SHA-256 du document présenté",
    signer: "Signataire",
    email: "Courriel",
    signedAt: "Signé le",
    mode: "Mode de signature",
    modeTyped: "Nom saisi au clavier",
    modeDrawn: "Signature tracée",
    ip: "Adresse IP",
    agent: "Navigateur",
    consent: "Consentement",
    consentText:
      "Le signataire a déclaré avoir lu le document et accepté de le signer par voie électronique.",
    nature:
      "Signature électronique simple au sens de la LCCJTI (Québec) et du règlement eIDAS (niveau simple). Aucun certificat de prestataire de services de confiance n'est associé à cette signature.",
    page: (n: number, total: number) => `Page ${n} sur ${total}`,
  },
  en: {
    contract: "CONTRACT",
    audit: "Signature audit trail",
    auditLead:
      "This document was signed electronically. The items below form the audit trail retained by the issuer.",
    documentRef: "Document reference",
    fingerprint: "SHA-256 fingerprint of the presented document",
    signer: "Signer",
    email: "Email",
    signedAt: "Signed on",
    mode: "Signature method",
    modeTyped: "Name typed",
    modeDrawn: "Drawn signature",
    ip: "IP address",
    agent: "Browser",
    consent: "Consent",
    consentText:
      "The signer declared having read the document and agreed to sign it electronically.",
    nature:
      "Simple electronic signature under Quebec's LCCJTI and the eIDAS regulation (simple level). No trust service provider certificate is associated with this signature.",
    page: (n: number, total: number) => `Page ${n} of ${total}`,
  },
} as const;

export type ContractDocument = {
  contractNumber: string;
  title: string;
  body: string;
  locale: Locale;
};

/**
 * Rend en PDF un contrat rédigé dans l'application.
 *
 * Le corps est du texte brut à paragraphes, pas du Markdown interprété : un
 * contrat n'a pas à contenir de lien cliquable ni d'image, et interpréter du
 * balisage dans un document qui engage juridiquement ouvrirait une surface
 * inutile. Les lignes commençant par `#` deviennent des titres, c'est tout.
 */
export async function renderContractPdf(contract: ContractDocument): Promise<Buffer> {
  const t = T[contract.locale];
  const builder = await createDocument();

  text(builder, t.contract, { size: 9, bold: true, color: MUTED });
  text(builder, contract.title, { size: 18, bold: true });
  text(builder, contract.contractNumber, { size: 9, color: MUTED });
  gap(builder, 8);
  rule(builder);
  gap(builder, 10);

  for (const block of contract.body.split(/\n{2,}/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#")) {
      heading(builder, trimmed.replace(/^#+\s*/, ""), 12);
      continue;
    }

    text(builder, trimmed, { size: 10, leading: 1.5 });
    gap(builder, 8);
  }

  paginate(builder, t.page);
  return finish(builder);
}

export type SignatureRecord = {
  name: string;
  email: string;
  role: string;
  mode: "typed" | "drawn";
  /** Nom saisi, ou image PNG encodée en base64 (avec ou sans préfixe). */
  value: string;
  signedAt: Date;
  ip: string;
  userAgent: string;
};

/**
 * Appose les signatures et la piste d'audit sur un PDF existant.
 *
 * C'est la raison d'être de `pdf-lib` dans ce projet : le document scellé peut
 * être un contrat que nous avons rendu **ou un PDF déposé par un client**, que
 * nous n'avons pas produit et dont nous ignorons la mise en page. On ne le
 * réécrit pas — on l'ouvre, on ajoute des pages, on enregistre. Le contenu
 * d'origine est préservé octet pour octet dans les pages existantes.
 *
 * La page d'audit est **ajoutée**, jamais superposée au contenu : écrire
 * par-dessus le texte d'un contrat pourrait en masquer une clause.
 */
export async function sealContract(
  source: Buffer,
  signatures: SignatureRecord[],
  meta: { contractNumber: string; title: string; hash: string; locale: Locale },
): Promise<Buffer> {
  const t = T[meta.locale];
  const doc = await PDFDocument.load(source);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const nextPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  };

  const line = (
    content: string,
    options: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; indent?: number } = {},
  ) => {
    const size = options.size ?? 10;
    const font = options.bold ? bold : regular;
    const x = MARGIN + (options.indent ?? 0);

    for (const part of wrap(content, font, size, CONTENT_WIDTH - (options.indent ?? 0))) {
      if (y - size * 1.4 < MARGIN) nextPage();
      y -= size * 1.4;
      if (!part) continue;
      page.drawText(part, { x, y, size, font, color: options.color ?? rgb(0.09, 0.09, 0.09) });
    }
  };

  const divider = () => {
    if (y - 10 < MARGIN) nextPage();
    y -= 10;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.75,
      color: RULE,
    });
    y -= 6;
  };

  line(t.audit, { size: 15, bold: true });
  y -= 6;
  line(t.auditLead, { size: 9, color: MUTED });
  divider();

  line(t.documentRef, { size: 9, bold: true, color: MUTED });
  line(`${meta.contractNumber} — ${meta.title}`, { size: 10 });
  y -= 6;

  line(t.fingerprint, { size: 9, bold: true, color: MUTED });
  // L'empreinte est coupée en deux : soixante-quatre caractères d'hexadécimal
  // ne tiennent pas sur une ligne à cette taille, et la couper au hasard la
  // rendrait pénible à recopier pour vérification.
  line(meta.hash.slice(0, 32), { size: 9 });
  line(meta.hash.slice(32), { size: 9 });
  divider();

  for (const [index, signature] of signatures.entries()) {
    if (y < MARGIN + 190) nextPage();

    line(`${t.signer} ${index + 1}`, { size: 11, bold: true });
    y -= 4;

    for (const [label, value] of [
      ["", signature.role ? `${signature.name} — ${signature.role}` : signature.name],
      [t.email, signature.email],
      [
        t.signedAt,
        new Intl.DateTimeFormat(meta.locale === "fr" ? "fr-CA" : "en-CA", {
          dateStyle: "long",
          timeStyle: "long",
          timeZone: "UTC",
        }).format(signature.signedAt),
      ],
      [t.mode, signature.mode === "drawn" ? t.modeDrawn : t.modeTyped],
      [t.ip, signature.ip || "—"],
      [t.agent, signature.userAgent || "—"],
    ]) {
      if (!label) {
        line(value, { size: 10, bold: true });
        continue;
      }
      line(`${label} : ${value}`, { size: 9, color: MUTED });
    }

    y -= 8;

    const drawn = signature.mode === "drawn" ? checkSignaturePng(signature.value) : null;

    if (drawn?.ok) {
      /*
       * L'image a été reconnue avant d'arriver ici. C'est essentiel : le
       * décodeur PNG de `pdf-lib` **boucle indéfiniment** sur certaines entrées
       * malformées au lieu de lever, et un `try/catch` ne rattrape pas un
       * blocage. Comme le tracé vient d'un signataire externe sans compte, la
       * validation préalable est la seule protection. Le `try/catch` reste pour
       * ce qui pourrait encore mal tourner à l'intégration.
       */
      try {
        const image = await doc.embedPng(drawn.bytes);
        const scale = Math.min(180 / image.width, 60 / image.height, 1);
        const width = image.width * scale;
        const height = image.height * scale;
        if (y - height < MARGIN) nextPage();
        y -= height;
        page.drawImage(image, { x: MARGIN, y, width, height });
      } catch (error) {
        console.error("[contrats] signature tracée non intégrée :", error);
        line(signature.name, { size: 14, bold: true });
      }
    } else if (signature.mode === "drawn") {
      // Tracé refusé à la validation : le nom du signataire reste la trace, et
      // la piste d'audit dit par quel mode la signature avait été apposée.
      console.error("[contrats] tracé refusé :", drawn?.ok === false ? drawn.reason : "inconnu");
      line(signature.name, { size: 14, bold: true });
    } else {
      line(sanitize(signature.value || signature.name), { size: 14, bold: true });
    }

    y -= 4;
    line(`${t.consent} : ${t.consentText}`, { size: 8, color: MUTED });
    divider();
  }

  line(t.nature, { size: 8, color: MUTED });

  return Buffer.from(await doc.save());
}
