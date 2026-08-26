import {
  ClientProjectModel,
  ConversationModel,
  QuoteRequestModel,
  StoredFileModel,
} from "@/lib/db/models/platform";
import type { PlatformSession } from "@/lib/platform/access";
import { isAdminRole } from "@/lib/platform/enums";

/**
 * Autorisation d'accès à un fichier privé.
 *
 * ## Principe
 *
 * Un fichier n'est jamais servi parce qu'on connaît son identifiant. Chaque
 * demande repart du document, de sa portée et du **rattachement** qui la
 * justifie — devis, projet ou conversation — et vérifie que ce rattachement
 * appartient bien au compte qui demande.
 *
 * ## Pourquoi la vérification est ici et pas dans la route
 *
 * Trois routes servent des fichiers : le téléchargement direct, la pièce
 * jointe d'un message et la ressource de la bibliothèque. Dupliquer la règle
 * trois fois, c'est garantir qu'une des trois finira par diverger.
 */

type FileDoc = {
  _id: unknown;
  visibility?: string;
  ownerUserId?: string;
  quoteRequestId?: unknown;
  projectId?: unknown;
  conversationId?: unknown;
  filename?: string;
  originalFilename?: string;
  mimeType?: string;
  size?: number;
  gridFsFileId?: unknown;
};

export type FileAccess =
  | { allowed: true; file: FileDoc }
  | { allowed: false; reason: "not_found" | "unauthenticated" | "forbidden" };

export async function resolveFileAccess(
  fileId: string,
  session: PlatformSession | null,
): Promise<FileAccess> {
  const file = (await StoredFileModel.findById(fileId).lean()) as FileDoc | null;
  if (!file) return { allowed: false, reason: "not_found" };

  const visibility = String(file.visibility ?? "admin_only");

  // L'administration accède à tout : c'est elle qui dépose ces documents.
  if (session && isAdminRole(session.user.role)) return { allowed: true, file };

  if (visibility === "public") return { allowed: true, file };
  if (!session) return { allowed: false, reason: "unauthenticated" };
  if (visibility === "admin_only") return { allowed: false, reason: "forbidden" };
  if (visibility === "client_account") return { allowed: true, file };

  const userId = session.user.id;

  if (visibility === "specific_client") {
    if (file.ownerUserId && file.ownerUserId === userId) return { allowed: true, file };
    // Un fichier attaché à une demande de devis suit la demande.
    if (file.quoteRequestId) {
      const owns = await QuoteRequestModel.exists({ _id: file.quoteRequestId, userId });
      if (owns) return { allowed: true, file };
    }
    if (file.conversationId) {
      const owns = await ConversationModel.exists({ _id: file.conversationId, clientId: userId });
      if (owns) return { allowed: true, file };
    }
    return { allowed: false, reason: "forbidden" };
  }

  if (visibility === "specific_project") {
    if (!file.projectId) return { allowed: false, reason: "forbidden" };
    const owns = await ClientProjectModel.exists({ _id: file.projectId, clientId: userId });
    return owns ? { allowed: true, file } : { allowed: false, reason: "forbidden" };
  }

  return { allowed: false, reason: "forbidden" };
}
