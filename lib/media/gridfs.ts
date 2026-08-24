import { GridFSBucket, ObjectId } from "mongodb";
import mongoose from "mongoose";

/** Nom du bucket GridFS : collections `media.files` et `media.chunks`. */
export const MEDIA_BUCKET = "media";

export function mediaBucket(): GridFSBucket | null {
  const db = mongoose.connection.db;
  return db ? new GridFSBucket(db, { bucketName: MEDIA_BUCKET }) : null;
}

/**
 * Supprime un fichier GridFS **et ses chunks**.
 *
 * `GridFSBucket.delete` retire le document de `media.files` puis tous les
 * documents `media.chunks` associés. Un fichier déjà absent n'est pas une
 * erreur — le but est que le binaire ne soit plus là.
 *
 * Renvoie `true` si la suppression est effective (ou le fichier déjà absent),
 * `false` si elle a échoué pour une autre raison : l'appelant doit alors
 * conserver le document Mongo plutôt que de laisser un binaire orphelin.
 */
export async function deleteGridFsFile(fileId: unknown): Promise<boolean> {
  if (!fileId) return true;

  const bucket = mediaBucket();
  if (!bucket) return false;

  try {
    await bucket.delete(new ObjectId(String(fileId)));
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // Le pilote signale l'absence du fichier par ce message : c'est le
    // résultat recherché, pas un échec.
    if (/File not found|FileNotFound/i.test(message)) return true;
    console.error("[media] suppression GridFS impossible :", error);
    return false;
  }
}
