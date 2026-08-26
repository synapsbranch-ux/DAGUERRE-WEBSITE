/**
 * Génération de CSV.
 *
 * Une cellule commençant par `=`, `+`, `-` ou `@` est interprétée comme une
 * **formule** par Excel, LibreOffice et Google Sheets. Un abonné dont le nom
 * serait `=HYPERLINK("http://…")` transformerait donc l'export en vecteur
 * d'attaque à l'ouverture du fichier. Le préfixe d'apostrophe neutralise
 * l'interprétation sans altérer la valeur affichée.
 */

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  const guarded = FORMULA_START.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}

/**
 * Document CSV complet.
 *
 * Le marqueur d'ordre des octets fait ouvrir le fichier en UTF-8 par Excel
 * sous Windows, qui supposerait sinon un encodage local et abîmerait les
 * accents. Les fins de ligne sont `CRLF`, comme l'attend le format.
 */
export function csvDocument(header: string[], rows: unknown[][]): string {
  return `﻿${[csvRow(header), ...rows.map(csvRow)].join("\r\n")}\r\n`;
}
