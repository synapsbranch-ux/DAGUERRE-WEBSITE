"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { messageStatusLabels, messageStatuses, type MessageStatus } from "@/lib/messages";

/**
 * Cycle de vie d'un message : nouveau → lu → répondu → archivé.
 *
 * Chaque étape reste accessible dans les deux sens — un message archivé par
 * erreur se remet en « lu » sans passer par la base.
 */
export function MessageActions({
  id,
  status,
  mailto,
}: {
  id: string;
  status: MessageStatus;
  mailto: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = async (next: MessageStatus) => {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/messages/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (!response.ok) {
      setError("Le statut n’a pas pu être modifié.");
      return;
    }
    router.refresh();
  };

  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild>
          <a href={mailto}>Répondre par courriel</a>
        </Button>

        {messageStatuses
          .filter((candidate) => candidate !== status)
          .map((candidate) => (
            <Button key={candidate} variant="secondary" disabled={busy} onClick={() => update(candidate)}>
              Marquer « {messageStatusLabels[candidate].toLowerCase()} »
            </Button>
          ))}

        <ConfirmAction
          trigger="Supprimer"
          title="Supprimer ce message ?"
          description="Un message est une donnée personnelle : sa suppression est définitive et ne peut pas être annulée."
          confirmLabel="Supprimer définitivement"
          endpoint={`/api/admin/messages/${id}`}
          redirectTo="/admin/messages"
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
