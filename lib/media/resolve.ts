import type { StaticImageData } from "next/image";

import { resolveKnownImageSource, type ImageSource } from "@/lib/media/assets";

/**
 * Résolution d'une source d'image du CMS.
 *
 * Un champ image contient l'une de trois choses : une URL absolue, une
 * référence GridFS (`/api/media/<id>`) ou rien. Ces fonctions en font soit une
 * source réellement affichable, soit `undefined` — jamais une URL morte que le
 * navigateur tenterait de charger pour rien.
 */

const absolute = /^https?:\/\/\S+$/;
const gridFs = /^\/api\/media\/[a-f0-9]{24}$/;

export function isUsableImage(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return absolute.test(trimmed) || gridFs.test(trimmed);
}

/**
 * Première référence utilisable parmi celles proposées, telle qu'elle est
 * stockée. L'ordre des arguments porte la priorité.
 */
export function resolveImage(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (isUsableImage(candidate)) return candidate.trim();
  }
  return undefined;
}

/**
 * Source prête à l'affichage, avec repli garanti.
 *
 * La première référence utilisable l'emporte ; à défaut, l'illustration de
 * repli déclarée par la page est employée. Une ancienne URL Google Drive dont
 * le fichier a été rapatrié dans `public/images/editorial` est silencieusement
 * remplacée par son import local — plus léger, dimensionné, et insensible à un
 * partage Drive révoqué.
 */
export function displayImage(candidates: unknown[], fallback: StaticImageData): ImageSource {
  const found = resolveImage(...candidates);
  return found ? resolveKnownImageSource(found) : fallback;
}

/**
 * Comme `displayImage`, mais sans repli : renvoie `undefined` quand aucune
 * source n'est utilisable, pour que l'appelant n'affiche simplement rien.
 */
export function optionalImage(...candidates: unknown[]): ImageSource | undefined {
  const found = resolveImage(...candidates);
  return found ? resolveKnownImageSource(found) : undefined;
}
