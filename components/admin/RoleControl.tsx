"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roleLabels, roles, type Role } from "@/lib/platform/enums";

/**
 * Attribution du rôle d'un compte.
 *
 * L'écriture part chez Logto, qui détient les rôles ; cette interface ne fait
 * que la déclencher. Le serveur revérifie tout — un rôle envoyé d'ici n'ouvre
 * rien par lui-même.
 *
 * Le délai de prise d'effet est annoncé explicitement. Un rôle change dans le
 * jeton de l'utilisateur concerné, pas dans le nôtre : tant qu'il n'a pas
 * rafraîchi sa session, il garde ses anciens droits. Laisser croire à un effet
 * immédiat ferait conclure à une panne.
 */
export function RoleControl({ userId, role, isSelf }: { userId: string; role: Role; isSelf: boolean }) {
  const router = useRouter();
  const [next, setNext] = useState<Role>(role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const changed = next !== role;

  async function apply() {
    setBusy(true);
    setError("");
    setNotice("");

    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: next }),
    }).catch(() => null);

    if (!response?.ok) {
      const payload = (await response?.json().catch(() => null)) as { error?: unknown } | null;
      setError(typeof payload?.error === "string" ? payload.error : "Le changement de rôle a échoué.");
      setBusy(false);
      return;
    }

    setNotice("Rôle enregistré dans Logto. Il prendra effet à la prochaine connexion de ce compte.");
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="grid gap-4 rounded-lg border border-border p-5">
      <div className="grid gap-1">
        <h2 className="font-heading text-lg">Rôle</h2>
        <p className="text-sm text-muted-foreground">
          Les rôles appartiennent à Logto. Le changement s&apos;y écrit et prend effet à la prochaine
          connexion du compte concerné.
        </p>
      </div>

      <div className="grid gap-2 sm:max-w-xs">
        <Label htmlFor="role">Rôle attribué</Label>
        <Select value={next} onValueChange={(value) => setNext(value as Role)} disabled={isSelf}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roles.map((value) => (
              <SelectItem key={value} value={value}>
                {roleLabels[value].fr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isSelf ? (
        <p className="text-sm text-muted-foreground">
          Vous ne pouvez pas modifier votre propre rôle. Sur une installation qui ne compte qu&apos;un
          administrateur, ce geste fermerait le tableau de bord à tout le monde.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

      <div>
        <Button type="button" disabled={busy || !changed || isSelf} onClick={apply}>
          {busy ? "Enregistrement…" : "Enregistrer le rôle"}
        </Button>
      </div>
    </section>
  );
}
