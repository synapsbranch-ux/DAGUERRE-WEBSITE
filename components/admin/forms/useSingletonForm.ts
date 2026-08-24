"use client";

import { useEffect, useState } from "react";

import type { AdminDoc } from "@/components/admin/forms/types";

/**
 * Chargement d'un réglage unique.
 *
 * Les singletons n'ont pas d'identifiant d'URL : leur écran lit le document
 * courant au montage, puis délègue l'édition au formulaire dédié. Tant que le
 * chargement n'est pas terminé, aucun formulaire n'est monté — sinon un
 * enregistrement rapide écraserait la base avec des champs vides.
 */
export function useSingletonDoc(kind: string) {
  const [doc, setDoc] = useState<AdminDoc | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/settings/${kind}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("chargement"))))
      .then((data: AdminDoc | null) => {
        if (cancelled) return;
        setDoc(data ?? {});
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return { doc, state } as const;
}
