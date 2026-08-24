"use client";

/**
 * États d'un écran de réglages avant montage du formulaire.
 *
 * `"ready"` fait partie du type parce que l'appelant passe son état brut : le
 * formulaire n'est monté qu'une fois le document chargé, et ce cas ne se rend
 * jamais en pratique.
 */
export function SingletonShell({ state }: { state: "loading" | "error" | "ready" }) {
  if (state === "error") {
    return (
      <p role="alert" className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        Ces réglages n’ont pas pu être chargés. Vérifiez la connexion à MongoDB, puis rechargez la page.
      </p>
    );
  }
  return (
    <p role="status" className="mt-8 text-sm text-muted-foreground">
      Chargement des réglages…
    </p>
  );
}
