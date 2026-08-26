import { GridFSBucket, ObjectId } from "mongodb";
import mongoose from "mongoose";
import { Readable } from "node:stream";

/**
 * Stockage des fichiers **privés**.
 *
 * Un second bucket GridFS, distinct de `media` :
 *
 * - `media` sert les images publiques du site, avec un cache immuable d'un an
 *   et aucun contrôle d'accès — c'est voulu, ce sont des illustrations ;
 * - `files` porte les documents des clients — cahiers des charges, jeux de
 *   données, rapports, propositions. Rien n'y est servi sans contrôle
 *   d'autorisation, et jamais avec un cache partagé.
 *
 * Les mélanger aurait fait dépendre la confidentialité d'un document
 * contractuel d'un `if` posé au bon endroit dans une route conçue pour des
 * images.
 */

export const FILE_BUCKET = "files";

/** Taille maximale d'un fichier téléversé : 20 Mo. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Taille maximale d'une pièce jointe de demande de devis : 10 Mo. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export function filesBucket(): GridFSBucket | null {
  const db = mongoose.connection.db;
  return db ? new GridFSBucket(db, { bucketName: FILE_BUCKET }) : null;
}

/**
 * Types acceptés.
 *
 * Liste blanche, jamais liste noire : tout ce qui n'y figure pas est refusé.
 * Aucun format exécutable n'y entre — ni `.exe`, ni `.js`, ni `.svg` (qui peut
 * porter du script et s'ouvrirait dans le navigateur du destinataire).
 */
export const ALLOWED_FILE_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/zip": "zip",
  "text/plain": "txt",
  "application/json": "json",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Signatures binaires vérifiées à l'entrée.
 *
 * Le type MIME annoncé par le navigateur vient du client : il se change d'un
 * clic. Pour les formats qui ont un en-tête reconnaissable, on lit les
 * premiers octets. Les formats texte (CSV, TXT, JSON) n'en ont pas ; ils sont
 * inoffensifs à stocker et ne sont jamais servis en ligne.
 */
const MAGIC: Record<string, (bytes: Buffer) => boolean> = {
  pdf: (bytes) => bytes.subarray(0, 4).toString("latin1") === "%PDF",
  // Les formats Office modernes et les ZIP partagent l'en-tête `PK\x03\x04`.
  zip: (bytes) => bytes[0] === 0x50 && bytes[1] === 0x4b,
  jpg: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8,
  png: (bytes) => bytes.subarray(1, 4).toString("latin1") === "PNG",
  webp: (bytes) =>
    bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP",
};

const ZIP_BASED = new Set(["xlsx", "docx", "pptx", "zip"]);

export type FileCheck = { ok: true; extension: string } | { ok: false; reason: string };

/** Contrôle du type déclaré **et** du contenu réel. */
export function checkFile(file: File, bytes: Buffer, maxBytes = MAX_FILE_BYTES): FileCheck {
  if (bytes.length === 0) return { ok: false, reason: "Fichier vide." };
  if (bytes.length > maxBytes) {
    return { ok: false, reason: `Fichier trop volumineux (${Math.round(maxBytes / 1024 / 1024)} Mo maximum).` };
  }

  const extension = ALLOWED_FILE_TYPES[file.type];
  if (!extension) return { ok: false, reason: "Format de fichier non autorisé." };

  const check = MAGIC[ZIP_BASED.has(extension) ? "zip" : extension];
  if (check && !check(bytes)) {
    return { ok: false, reason: "Le contenu du fichier ne correspond pas à son type déclaré." };
  }

  return { ok: true, extension };
}

/**
 * Nom de fichier assaini.
 *
 * Le nom d'origine est conservé pour l'affichage, mais celui qui sert au
 * stockage et à l'en-tête de téléchargement est réécrit : ni séparateur de
 * chemin, ni caractère de contrôle, ni guillemet — trois façons connues de
 * détourner un `Content-Disposition` ou d'écrire hors du dossier voulu.
 */
export function safeFilename(name: string, extension: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return `${base || "document"}.${extension}`;
}

/** Écrit un binaire dans le bucket privé et renvoie sa clé de stockage. */
export async function storePrivateFile(bytes: Buffer, filename: string, contentType: string): Promise<ObjectId> {
  const bucket = filesBucket();
  if (!bucket) throw new Error("Stockage de fichiers indisponible.");

  const fileId = new ObjectId();
  await new Promise<void>((resolve, reject) =>
    Readable.from(bytes)
      .pipe(bucket.openUploadStreamWithId(fileId, filename, { metadata: { contentType } }))
      .on("error", reject)
      .on("finish", resolve),
  );
  return fileId;
}

/** Lit un binaire du bucket privé, ou `null` si le fichier a disparu. */
export async function readPrivateFile(fileId: unknown): Promise<Buffer | null> {
  const bucket = filesBucket();
  if (!bucket || !fileId) return null;

  const chunks: Uint8Array[] = [];
  try {
    const stream = bucket.openDownloadStream(new ObjectId(String(fileId)));
    await new Promise<void>((resolve, reject) =>
      stream
        .on("data", (chunk: Buffer) => chunks.push(chunk))
        .on("error", reject)
        .on("end", resolve),
    );
  } catch {
    return null;
  }

  return Buffer.concat(chunks);
}

export async function deletePrivateFile(fileId: unknown): Promise<boolean> {
  const bucket = filesBucket();
  if (!bucket || !fileId) return !fileId;

  try {
    await bucket.delete(new ObjectId(String(fileId)));
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/File not found|FileNotFound/i.test(message)) return true;
    console.error("[files] suppression impossible :", error);
    return false;
  }
}

/**
 * En-tête de téléchargement.
 *
 * `attachment` force l'enregistrement plutôt que l'ouverture dans l'onglet :
 * un document client n'a pas à être rendu par le navigateur, et cela ferme la
 * porte au HTML ou au SVG affiché depuis notre propre origine.
 * `filename*` transporte les accents ; `filename` reste pour les clients
 * anciens, avec les guillemets échappés.
 */
export function downloadHeaders(filename: string, contentType: string, size: number): HeadersInit {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return {
    "content-type": contentType || "application/octet-stream",
    "content-length": String(size),
    "content-disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    // Un document privé ne doit jamais être mis en cache par un intermédiaire.
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
  };
}
