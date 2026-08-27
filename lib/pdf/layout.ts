import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

/**
 * Mise en page PDF.
 *
 * Une couche mince au-dessus de `pdf-lib`, qui ne connaît que des primitives :
 * poser du texte à des coordonnées absolues. Ce module y ajoute ce dont un
 * document d'affaires a besoin — un curseur qui descend, un saut de page
 * automatique, du texte qui se renvoie à la ligne, et des colonnes de montants
 * alignées à droite.
 *
 * ## Pourquoi `pdf-lib` plutôt qu'un navigateur sans interface
 *
 * Puppeteer rendrait le HTML fidèlement, mais ajouterait un binaire Chromium et
 * quelque trois cents mégaoctets au déploiement. Surtout, il ne sait pas faire
 * ce dont la signature électronique a besoin : **ouvrir un PDF déposé par un
 * client et y apposer des signatures**. `pdf-lib` le fait, et sert donc aussi
 * bien les factures que les contrats.
 *
 * ## Encodage
 *
 * Les polices standard PDF encodent en WinAnsi, qui couvre le français mais
 * lève une exception sur tout caractère hors de son répertoire — une émoji
 * collée dans une description suffirait à faire échouer une facture. Le texte
 * est donc assaini avant d'être posé.
 */

/** Lettre US : le format d'affaires nord-américain. */
export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;
export const MARGIN = 54;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export const INK = rgb(0.09, 0.09, 0.09);
export const MUTED = rgb(0.45, 0.45, 0.45);
export const RULE = rgb(0.82, 0.82, 0.82);
export const PLATE = rgb(0.96, 0.96, 0.95);

/**
 * Substitutions typographiques appliquées avant l'assainissement.
 *
 * Les motifs sont écrits en échappements Unicode plutôt qu'en caractères
 * littéraux : U+2028 et U+2029 sont des séparateurs de ligne, et les poser tels
 * quels dans une source JavaScript y coupe la ligne — l'expression régulière ne
 * se referme jamais.
 */
const SUBSTITUTIONS: [RegExp, string][] = [
  // Espaces fines et sans chasse → espace insécable, que WinAnsi connaît.
  [/[\u2009\u200A\u202F]/g, "\u00A0"],
  // Espaces de largeur nulle et marque d'ordre des octets : purement invisibles.
  [/[\u200B-\u200D\uFEFF]/g, ""],
  [/[\u2010\u2011\u2012\u2043]/g, "-"],
  [/[\u2018\u2019\u201B]/g, "'"],
  [/[\u201C\u201D\u201F]/g, '"'],
  [/\u2044/g, "/"],
  // Séparateurs de ligne et de paragraphe → saut de ligne ordinaire.
  [/[\u2028\u2029]/g, "\n"],
];

/**
 * Caractères que WinAnsi représente aux octets 0x80–0x9F.
 *
 * Leur point de code Unicode n'a **rien à voir** avec cet octet : le tiret
 * cadratin s'encode 0x97 mais vaut U+2014. Tester la plage 0x80–0x9F sur le
 * point de code laisserait donc passer les caractères de contrôle C1 tout en
 * rejetant les tirets, guillemets courbes et points de suspension — c'est-à-dire
 * la ponctuation courante d'un texte français.
 */
const WINANSI_EXTRAS = new Set([
  0x20ac, // €
  0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d,
  0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

/**
 * Rend une chaîne sûre pour l'encodage WinAnsi.
 *
 * Ce qui n'est pas représentable est remplacé plutôt que supprimé : un mot
 * amputé en silence est plus trompeur qu'un point d'interrogation visible.
 */
export function sanitize(input: unknown): string {
  let text = String(input ?? "");
  for (const [pattern, replacement] of SUBSTITUTIONS) text = text.replace(pattern, replacement);

  return [...text]
    .map((char) => {
      const code = char.codePointAt(0) ?? 0;
      if (char === "\n" || char === "\t") return char;
      // ASCII imprimable.
      if (code >= 0x20 && code <= 0x7e) return char;
      // Latin-1 imprimable — accents français compris.
      if (code >= 0xa0 && code <= 0xff) return char;
      if (WINANSI_EXTRAS.has(code)) return char;
      return "?";
    })
    .join("");
}

export type Fonts = { regular: PDFFont; bold: PDFFont };

export type DocumentBuilder = {
  doc: PDFDocument;
  fonts: Fonts;
  page: PDFPage;
  /** Ordonnée du curseur, mesurée depuis le bas de la page comme en PDF. */
  y: number;
  pages: PDFPage[];
};

export async function createDocument(): Promise<DocumentBuilder> {
  const doc = await PDFDocument.create();
  const fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  return { doc, fonts, page, y: PAGE_HEIGHT - MARGIN, pages: [page] };
}

/** Ajoute une page et remonte le curseur en haut de celle-ci. */
export function newPage(builder: DocumentBuilder): void {
  builder.page = builder.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  builder.pages.push(builder.page);
  builder.y = PAGE_HEIGHT - MARGIN;
}

/** Réserve la hauteur demandée, en changeant de page si elle ne tient pas. */
export function reserve(builder: DocumentBuilder, height: number): void {
  if (builder.y - height < MARGIN) newPage(builder);
}

export type TextOptions = {
  size?: number;
  bold?: boolean;
  color?: ReturnType<typeof rgb>;
  x?: number;
  /** Largeur de renvoi à la ligne ; par défaut, la largeur utile. */
  width?: number;
  /** Interligne, en multiples de la taille. */
  leading?: number;
};

/** Découpe un texte pour qu'aucune ligne ne dépasse la largeur donnée. */
export function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];

  for (const paragraph of sanitize(text).split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);

      // Un mot plus large que la colonne — une URL, typiquement — est coupé
      // par force plutôt que de déborder dans la marge.
      if (font.widthOfTextAtSize(word, size) > width) {
        let chunk = "";
        for (const char of word) {
          if (font.widthOfTextAtSize(chunk + char, size) > width) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

/** Pose un bloc de texte et fait descendre le curseur. */
export function text(builder: DocumentBuilder, content: string, options: TextOptions = {}): void {
  const size = options.size ?? 10;
  const font = options.bold ? builder.fonts.bold : builder.fonts.regular;
  const width = options.width ?? CONTENT_WIDTH;
  const leading = (options.leading ?? 1.35) * size;

  for (const line of wrap(content, font, size, width)) {
    reserve(builder, leading);
    builder.y -= leading;
    if (!line) continue;
    builder.page.drawText(line, {
      x: options.x ?? MARGIN,
      y: builder.y,
      size,
      font,
      color: options.color ?? INK,
    });
  }
}

/** Pose un texte aligné à droite d'une abscisse — pour les montants. */
export function textRight(
  builder: DocumentBuilder,
  content: string,
  right: number,
  options: TextOptions = {},
): void {
  const size = options.size ?? 10;
  const font = options.bold ? builder.fonts.bold : builder.fonts.regular;
  const value = sanitize(content);
  builder.page.drawText(value, {
    x: right - font.widthOfTextAtSize(value, size),
    y: builder.y,
    size,
    font,
    color: options.color ?? INK,
  });
}

/** Espace vertical. */
export function gap(builder: DocumentBuilder, height: number): void {
  reserve(builder, height);
  builder.y -= height;
}

/** Filet horizontal pleine largeur. */
export function rule(builder: DocumentBuilder, color = RULE): void {
  reserve(builder, 8);
  builder.y -= 8;
  builder.page.drawLine({
    start: { x: MARGIN, y: builder.y },
    end: { x: PAGE_WIDTH - MARGIN, y: builder.y },
    thickness: 0.75,
    color,
  });
}

/** Titre de section, avec son filet. */
export function heading(builder: DocumentBuilder, content: string, size = 13): void {
  gap(builder, 6);
  text(builder, content, { size, bold: true });
  rule(builder);
  gap(builder, 4);
}

export type Column = {
  header: string;
  width: number;
  align?: "left" | "right";
};

/**
 * Tableau à colonnes fixes.
 *
 * Les lignes se renvoient à la ligne dans leur colonne et la hauteur de rangée
 * s'ajuste à la plus haute. L'en-tête est **répété** après un saut de page :
 * sans cela, la deuxième page d'une longue facture présenterait des colonnes de
 * chiffres sans dire ce qu'elles comptent.
 */
export function table(
  builder: DocumentBuilder,
  columns: Column[],
  rows: string[][],
  options: { size?: number } = {},
): void {
  const size = options.size ?? 9;
  const leading = size * 1.35;
  const padding = 6;

  const drawHeader = () => {
    reserve(builder, leading + padding * 2);
    builder.y -= leading + padding;

    let x = MARGIN;
    for (const column of columns) {
      const label = sanitize(column.header);
      const width = builder.fonts.bold.widthOfTextAtSize(label, size);
      builder.page.drawText(label, {
        x: column.align === "right" ? x + column.width - width : x,
        y: builder.y,
        size,
        font: builder.fonts.bold,
        color: MUTED,
      });
      x += column.width;
    }

    builder.y -= padding;
    builder.page.drawLine({
      start: { x: MARGIN, y: builder.y },
      end: { x: PAGE_WIDTH - MARGIN, y: builder.y },
      thickness: 0.75,
      color: RULE,
    });
  };

  drawHeader();

  for (const row of rows) {
    const cells = row.map((cell, index) =>
      wrap(cell, builder.fonts.regular, size, columns[index].width - 10),
    );
    const height = Math.max(...cells.map((lines) => lines.length)) * leading + padding;

    if (builder.y - height < MARGIN) {
      newPage(builder);
      drawHeader();
    }

    const top = builder.y - padding;
    let x = MARGIN;

    for (const [index, lines] of cells.entries()) {
      const column = columns[index];
      let lineY = top;
      for (const line of lines) {
        lineY -= leading;
        const width = builder.fonts.regular.widthOfTextAtSize(line, size);
        builder.page.drawText(line, {
          x: column.align === "right" ? x + column.width - width : x,
          y: lineY,
          size,
          font: builder.fonts.regular,
          color: INK,
        });
      }
      x += column.width;
    }

    builder.y = top - Math.max(...cells.map((lines) => lines.length)) * leading;
  }

  builder.y -= 4;
  builder.page.drawLine({
    start: { x: MARGIN, y: builder.y },
    end: { x: PAGE_WIDTH - MARGIN, y: builder.y },
    thickness: 0.75,
    color: RULE,
  });
}

/**
 * Numérote les pages, une fois le document complet.
 *
 * « Page 1 sur 3 » exige de connaître le total : impossible tant que le
 * document s'écrit, d'où ce passage final.
 */
export function paginate(builder: DocumentBuilder, label: (page: number, total: number) => string): void {
  const total = builder.pages.length;
  builder.pages.forEach((page, index) => {
    const content = sanitize(label(index + 1, total));
    const width = builder.fonts.regular.widthOfTextAtSize(content, 8);
    page.drawText(content, {
      x: PAGE_WIDTH - MARGIN - width,
      y: MARGIN / 2,
      size: 8,
      font: builder.fonts.regular,
      color: MUTED,
    });
  });
}

export async function finish(builder: DocumentBuilder): Promise<Buffer> {
  return Buffer.from(await builder.doc.save());
}
