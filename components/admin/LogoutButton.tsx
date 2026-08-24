"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/** Ferme la session Better Auth puis renvoie vers la page de connexion. */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="secondary"
      size="sm"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => undefined);
        router.replace("/connexion");
        router.refresh();
      }}
    >
      {busy ? "Déconnexion…" : "Déconnexion"}
    </Button>
  );
}
