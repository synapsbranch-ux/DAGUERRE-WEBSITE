import { CounterModel } from "@/lib/db/models/platform";

/**
 * Identifiants lisibles par un humain.
 *
 * `DQ-2026-000123` se lit au téléphone, se cite dans un courriel et se
 * retrouve dans une recherche. L'`_id` MongoDB, lui, est une chaîne
 * hexadécimale de vingt-quatre caractères : il reste la clé technique, mais
 * n'est jamais l'identifiant montré au client.
 *
 * Le compteur est incrémenté de façon **atomique** côté serveur MongoDB.
 * Compter les documents existants pour en déduire le suivant produirait des
 * doublons dès que deux demandes arrivent en même temps.
 */
async function nextSequence(key: string): Promise<number> {
  const doc = await CounterModel.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
  return Number((doc as { value?: number } | null)?.value ?? 1);
}

function format(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(6, "0")}`;
}

/** Numéro de demande de devis, remis à zéro chaque année civile. */
export async function nextQuoteNumber(now = new Date()): Promise<string> {
  const year = now.getUTCFullYear();
  return format("DQ", year, await nextSequence(`quote:${year}`));
}

/** Numéro de projet client. */
export async function nextProjectNumber(now = new Date()): Promise<string> {
  const year = now.getUTCFullYear();
  return format("DP", year, await nextSequence(`project:${year}`));
}

/** Forme attendue d'un numéro de devis — utilisée par la recherche du CMS. */
export const quoteNumberPattern = /^DQ-\d{4}-\d{6}$/;
export const projectNumberPattern = /^DP-\d{4}-\d{6}$/;
