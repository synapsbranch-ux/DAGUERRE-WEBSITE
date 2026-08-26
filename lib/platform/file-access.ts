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
 * ## Pourquoi la règle est isolée
 *
 * Trois routes servent des fichiers : le téléchargement direct, la pièce
 * jointe d'un message et la ressource de la bibliothèque. Dupliquer la règle
 * trois fois, c'est garantir qu'une des trois finira par diverger.
 *
 * La décision est séparée des requêtes de base : `fileAccessDecision` est une
 * fonction pure, donc testable exhaustivement — ce qu'on ne peut pas se
 * permettre d'approximer sur un contrôle d'accès.
 */

export type FileDoc = {
  _id?: unknown;
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

/** Rattachements du demandeur, résolus en base avant la décision. */
export type Ownership = {
  ownsQuote: boolean;
  ownsProject: boolean;
  ownsConversation: boolean;
};

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: "unauthenticated" | "forbidden" };

const ALLOW: AccessDecision = { allowed: true };

/**
 * Décision d'accès, sans effet de bord.
 *
 * `viewer` vaut `null` pour un visiteur anonyme ; seule une ressource
 * `public` lui est ouverte, et toute autre portée renvoie `unauthenticated`
 * afin que l'appelant puisse proposer une connexion plutôt qu'un mur.
 */
export function fileAccessDecision(
  file: FileDoc,
  viewer: { id: string; role: string } | null,
  ownership: Ownership = { ownsQuote: false, ownsProject: false, ownsConversation: false },
): AccessDecision {
  const visibility = String(file.visibility ?? "admin_only");

  // L'administration accède à tout : c'est elle qui dépose ces documents.
  if (viewer && isAdminRole(viewer.role)) return ALLOW;

  if (visibility === "public") return ALLOW;
  if (!viewer) return { allowed: false, reason: "unauthenticated" };
  if (visibility === "admin_only") return { allowed: false, reason: "forbidden" };
  if (visibility === "client_account") return ALLOW;

  if (visibility === "specific_client") {
    if (file.ownerUserId && file.ownerUserId === viewer.id) return ALLOW;
    // Un fichier attaché à un dossier suit le dossier.
    if (file.quoteRequestId && ownership.ownsQuote) return ALLOW;
    if (file.conversationId && ownership.ownsConversation) return ALLOW;
    return { allowed: false, reason: "forbidden" };
  }

  if (visibility === "specific_project") {
    if (file.projectId && ownership.ownsProject) return ALLOW;
    return { allowed: false, reason: "forbidden" };
  }

  // Portée inconnue : on refuse. Une valeur inattendue ne doit jamais ouvrir.
  return { allowed: false, reason: "forbidden" };
}

export type FileAccess =
  | { allowed: true; file: FileDoc }
  | { allowed: false; reason: "not_found" | "unauthenticated" | "forbidden" };

/** Charge le fichier, résout les rattachements, puis applique la décision. */
export async function resolveFileAccess(
  fileId: string,
  session: PlatformSession | null,
): Promise<FileAccess> {
  const file = (await StoredFileModel.findById(fileId).lean()) as FileDoc | null;
  if (!file) return { allowed: false, reason: "not_found" };

  const viewer = session ? { id: session.user.id, role: session.user.role } : null;

  // Les rattachements ne sont interrogés que si la portée peut en dépendre.
  const visibility = String(file.visibility ?? "admin_only");
  const needsOwnership =
    Boolean(viewer) && (visibility === "specific_client" || visibility === "specific_project");

  const ownership: Ownership = needsOwnership
    ? {
        ownsQuote: file.quoteRequestId
          ? Boolean(await QuoteRequestModel.exists({ _id: file.quoteRequestId, userId: viewer!.id }))
          : false,
        ownsProject: file.projectId
          ? Boolean(await ClientProjectModel.exists({ _id: file.projectId, clientId: viewer!.id }))
          : false,
        ownsConversation: file.conversationId
          ? Boolean(await ConversationModel.exists({ _id: file.conversationId, clientId: viewer!.id }))
          : false,
      }
    : { ownsQuote: false, ownsProject: false, ownsConversation: false };

  const decision = fileAccessDecision(file, viewer, ownership);
  return decision.allowed ? { allowed: true, file } : { allowed: false, reason: decision.reason };
}
