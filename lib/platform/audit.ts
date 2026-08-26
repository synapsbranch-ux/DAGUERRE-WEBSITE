import { AdminAuditLogModel } from "@/lib/db/models/platform";
import type { AuditAction } from "@/lib/platform/enums";

/**
 * Journal des actions administratives.
 *
 * Ce qu'on y écrit : qui, quoi, sur quel objet, avec un contexte structuré
 * (ancien statut, nouveau statut, nombre de destinataires…).
 *
 * Ce qu'on n'y écrit **jamais** : mot de passe, jeton, corps d'un message
 * privé, contenu d'un document client. Le journal sert à retracer une
 * décision, pas à constituer une copie des données personnelles.
 *
 * L'écriture est volontairement « au mieux » : une panne du journal ne doit
 * pas annuler un changement de statut déjà appliqué.
 */
export async function recordAudit(entry: {
  actorId?: string;
  actorEmail?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await AdminAuditLogModel.create({
      actorId: entry.actorId ?? "",
      actorEmail: entry.actorEmail ?? "",
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? "",
      metadata: entry.metadata ?? {},
    });
  } catch (error) {
    console.error("[audit] écriture impossible :", error);
  }
}
