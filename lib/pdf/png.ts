import { inflateSync } from "node:zlib";

/**
 * Validation d'une image de signature.
 *
 * ## Pourquoi ce module existe
 *
 * Le décodeur PNG de `pdf-lib` **boucle indéfiniment** sur certaines entrées
 * malformées au lieu de lever — vérifié sur ce projet. Un `try/catch` n'y peut
 * rien : il n'y a pas d'exception à rattraper, seulement un processus qui ne
 * rend plus la main. Un délai d'attente non plus : JavaScript est mono-fil, et
 * aucune minuterie n'interrompt une boucle synchrone.
 *
 * Comme une signature tracée arrive d'un signataire externe — quelqu'un qui n'a
 * pas de compte et qu'on n'a aucune raison de croire bienveillant — cela suffit
 * à immobiliser un travailleur serveur avec une requête de quelques kilooctets.
 *
 * ## Ce que la validation structurelle ne suffit pas à écarter
 *
 * Vérifier la signature de fichier et l'en-tête IHDR **ne suffit pas** : la
 * charge utile qui bloquait ce projet avait un en-tête parfaitement valide, et
 * c'est son flux compressé qui égarait le décodeur.
 *
 * On décompresse donc nous-mêmes, avec le zlib natif de Node — qui lève au lieu
 * de boucler — et l'on vérifie que la taille obtenue correspond exactement à ce
 * que l'en-tête annonce. Le décodeur ne reçoit ainsi que des données dont on a
 * déjà établi qu'elles se décompressent, et à la bonne taille.
 */

/** Les huit octets qui ouvrent tout fichier PNG. */
const MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Une signature manuscrite tient largement dans ces bornes. */
const MAX_BYTES = 512 * 1024;
const MAX_WIDTH = 4_000;
const MAX_HEIGHT = 2_000;

export type PngCheck =
  | { ok: true; bytes: Buffer; width: number; height: number }
  | { ok: false; reason: string };

/**
 * Décode et vérifie une image de signature transmise en base64.
 *
 * Accepte le préfixe `data:image/png;base64,` que produit un `<canvas>`.
 */
export function checkSignaturePng(value: string): PngCheck {
  if (!value) return { ok: false, reason: "Image absente." };

  const base64 = value.replace(/^data:image\/png;base64,/, "").trim();

  // Quatre caractères de base64 pour trois octets : on borne avant de décoder,
  // pour ne pas allouer un tampon démesuré à partir d'une chaîne démesurée.
  if (base64.length > Math.ceil((MAX_BYTES * 4) / 3) + 8) {
    return { ok: false, reason: "Image trop volumineuse." };
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    return { ok: false, reason: "Encodage invalide." };
  }

  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > MAX_BYTES) return { ok: false, reason: "Image trop volumineuse." };

  // Signature + longueur d'IHDR + type + treize octets de données : le plus
  // petit PNG légitime dépasse cette taille.
  if (bytes.length < 8 + 4 + 4 + 13) return { ok: false, reason: "Fichier tronqué." };
  if (!bytes.subarray(0, 8).equals(MAGIC)) return { ok: false, reason: "Ce n'est pas une image PNG." };

  // IHDR doit être le tout premier bloc : la norme l'impose, et un fichier qui
  // s'en écarte est déjà suspect.
  if (bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    return { ok: false, reason: "En-tête PNG absent." };
  }

  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);

  if (width <= 0 || height <= 0) return { ok: false, reason: "Dimensions nulles." };
  if (width > MAX_WIDTH || height > MAX_HEIGHT) return { ok: false, reason: "Image trop grande." };

  const bitDepth = bytes[24];
  const colorType = bytes[25];

  // Ce qu'un `<canvas>` produit : huit bits par canal, en RVBA ou en RVB. Un
  // PNG entrelacé ou en palette n'a aucune raison d'arriver ici, et restreindre
  // réduit d'autant la surface offerte au décodeur.
  if (bitDepth !== 8) return { ok: false, reason: "Profondeur de bits non prise en charge." };
  if (colorType !== 6 && colorType !== 2) {
    return { ok: false, reason: "Type de couleur non pris en charge." };
  }
  if (bytes[28] !== 0) return { ok: false, reason: "Image entrelacée non prise en charge." };

  // Un PNG complet se termine par le bloc IEND ; son absence signale une
  // troncature, cas où le décodeur risque justement de s'égarer.
  if (!bytes.subarray(-8, -4).toString("ascii").endsWith("IEND")) {
    return { ok: false, reason: "Fichier incomplet." };
  }

  const pixels = colorType === 6 ? 4 : 3;
  // Chaque ligne est précédée d'un octet de filtre : c'est le format PNG.
  const expected = height * (1 + width * pixels);

  const data = collectImageData(bytes);
  if (!data) return { ok: false, reason: "Données d'image illisibles." };

  try {
    /*
     * `maxOutputLength` referme la porte des bombes de décompression : quelques
     * kilooctets ne doivent pas se déployer en gigaoctets. La borne est la
     * taille exacte attendue, plus la marge d'un octet de filtre par ligne.
     */
    const raw = inflateSync(data, { maxOutputLength: expected + height + 64 });
    if (raw.length !== expected) return { ok: false, reason: "Taille d'image incohérente." };
  } catch {
    return { ok: false, reason: "Flux compressé invalide." };
  }

  return { ok: true, bytes, width, height };
}

/**
 * Concatène les blocs IDAT en parcourant la structure du fichier.
 *
 * La norme autorise à répartir les données sur plusieurs blocs ; les lire d'un
 * seul tenant à un décalage fixe échouerait sur toute image un peu grande.
 * Renvoie `null` dès qu'une longueur de bloc déborde du fichier — c'est le
 * signe d'un fichier forgé, et la boucle ne doit pas s'y égarer.
 */
function collectImageData(bytes: Buffer): Buffer | null {
  const parts: Buffer[] = [];
  let offset = 8;

  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");

    // Longueur aberrante ou débordante : on refuse plutôt que de continuer.
    if (length > bytes.length) return null;
    const end = offset + 12 + length;
    if (end > bytes.length) return null;

    if (type === "IDAT") parts.push(bytes.subarray(offset + 8, offset + 8 + length));
    if (type === "IEND") break;

    offset = end;
  }

  return parts.length > 0 ? Buffer.concat(parts) : null;
}
