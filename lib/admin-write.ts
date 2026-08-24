/**
 * Normalisation des écritures du CMS, partagée par les routes de création et
 * de modification.
 */

export type WriteData = Record<string, unknown>;

/** Slug français d'un document — la forme canonique interne des URLs. */
export function frenchSlug(data: WriteData | null | undefined): string | undefined {
  const slug = data?.slug;
  if (typeof slug === "object" && slug) {
    const value = (slug as { fr?: unknown }).fr;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (typeof slug === "string" && slug.trim()) return slug.trim();
  return undefined;
}

/**
 * Prépare la date de publication.
 *
 * - Une date saisie est convertie telle quelle, **y compris dans le futur** :
 *   c'est ainsi qu'on planifie une publication, que les requêtes publiques
 *   filtrent ensuite avec `publishedAt <= now`.
 * - Un passage à `published` sans date reçoit l'instant courant.
 * - Un champ laissé vide efface la date au lieu d'écrire une chaîne vide dans
 *   un champ `Date`.
 */
export function normalizePublication(data: WriteData, existing?: WriteData | null): WriteData {
  const value = { ...data };
  const raw = value.publishedAt;

  if (typeof raw === "string") {
    if (raw.trim()) {
      value.publishedAt = new Date(raw);
    } else if (value.status === "published") {
      const previous = existing?.publishedAt;
      value.publishedAt = previous instanceof Date ? previous : new Date();
    } else {
      value.publishedAt = null;
    }
    return value;
  }

  if (value.status === "published" && !(existing?.publishedAt instanceof Date)) {
    value.publishedAt = new Date();
  }

  return value;
}
