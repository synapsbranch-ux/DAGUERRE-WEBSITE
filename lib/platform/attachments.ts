import { StoredFileModel } from "@/lib/db/models/platform";

/**
 * Rattachement de pièces jointes à un message.
 *
 * Un identifiant de fichier envoyé par le navigateur ne prouve rien. Sans
 * revérification, il suffirait d'en deviner un pour attacher — et donc rendre
 * lisible — le document d'un autre client dans sa propre conversation.
 *
 * La condition est portée **par la requête** : le fichier doit avoir été
 * déposé par cet expéditeur *et* rattaché à cette conversation. Les
 * identifiants qui ne satisfont pas les deux sont silencieusement écartés
 * plutôt que rejetés avec une erreur : une erreur distinguerait « n'existe
 * pas » de « pas à vous », ce qui répond déjà à la question qu'on ne veut pas
 * voir posée.
 */
export async function claimAttachments(
  fileIds: string[],
  owner: { conversationId: string; uploadedBy: string },
): Promise<string[]> {
  if (fileIds.length === 0) return [];

  const docs = (await StoredFileModel.find({
    _id: { $in: fileIds },
    conversationId: owner.conversationId,
    uploadedBy: owner.uploadedBy,
  })
    .select("_id")
    .lean()) as { _id: unknown }[];

  return docs.map((doc) => String(doc._id));
}
