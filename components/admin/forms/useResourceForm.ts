"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import type { FieldErrors } from "@/components/admin/forms/fields";

/**
 * État d'un formulaire d'administration.
 *
 * Les routes renvoient `error.flatten()` de Zod en cas d'échec : les
 * `fieldErrors` sont remontés tels quels aux champs concernés, et les
 * `formErrors` s'affichent en tête. Le formulaire distingue trois issues —
 * succès, erreur de validation par champ, erreur globale — au lieu du message
 * unique « la sauvegarde a échoué » qui n'aidait personne à corriger sa saisie.
 */

type ZodFlattened = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

export type SubmitTarget = {
  url: string;
  method: "POST" | "PATCH" | "PUT";
  /** Où retourner après une création réussie. */
  redirectTo?: string;
};

export type ResourceFormState<T> = {
  value: T;
  setValue: (updater: (current: T) => T) => void;
  patch: (partial: Partial<T>) => void;
  errors: FieldErrors;
  formError: string;
  saving: boolean;
  notice: string;
  submit: (event: React.FormEvent) => Promise<void>;
  dirty: boolean;
};

export function useResourceForm<T>({
  initial,
  target,
  toPayload,
}: {
  initial: T;
  target: SubmitTarget;
  toPayload: (value: T) => unknown;
}): ResourceFormState<T> {
  const router = useRouter();
  const [value, setValueState] = useState<T>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const setValue = useCallback((updater: (current: T) => T) => {
    setValueState(updater);
    setDirty(true);
    setNotice("");
  }, []);

  const patch = useCallback(
    (partial: Partial<T>) => setValue((current) => ({ ...current, ...partial })),
    [setValue],
  );

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setSaving(true);
      setErrors({});
      setFormError("");
      setNotice("");

      let response: Response;
      try {
        response = await fetch(target.url, {
          method: target.method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(toPayload(value)),
        });
      } catch {
        setSaving(false);
        setFormError("Le serveur est injoignable. Vos modifications ne sont pas enregistrées.");
        return;
      }

      const body = (await response.json().catch(() => null)) as
        | { error?: string | ZodFlattened; id?: string }
        | null;
      setSaving(false);

      if (!response.ok) {
        const detail = body?.error;
        if (detail && typeof detail === "object") {
          setErrors(detail.fieldErrors ?? {});
          setFormError(
            detail.formErrors?.[0] ??
              "Certains champs sont invalides : les erreurs sont indiquées ci-dessous.",
          );
          return;
        }
        setFormError(
          typeof detail === "string"
            ? detail
            : response.status === 401 || response.status === 403
              ? "Votre session a expiré. Reconnectez-vous."
              : "L’enregistrement a échoué.",
        );
        return;
      }

      setDirty(false);
      setNotice("Enregistré. Le site public est mis à jour.");

      if (target.redirectTo && body?.id) {
        router.replace(target.redirectTo);
      }
      router.refresh();
    },
    [router, target, toPayload, value],
  );

  return { value, setValue, patch, errors, formError, saving, notice, submit, dirty };
}
