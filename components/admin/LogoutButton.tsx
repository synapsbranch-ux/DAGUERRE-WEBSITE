import { Button } from "@/components/ui/button";

/**
 * Déconnexion — passe par Logto.
 *
 * Un vrai formulaire, pas un `fetch` : la déconnexion enchaîne deux
 * redirections (purge de la session locale, puis fin de session chez Logto), et
 * seule une navigation complète les suit correctement. Un `fetch` les
 * absorberait en silence et laisserait la session ouverte côté fournisseur — le
 * visiteur se croirait déconnecté, mais la connexion suivante ne lui
 * redemanderait rien.
 *
 * `POST` et non `GET` : une déconnexion accessible en `GET` se déclenche depuis
 * une simple balise `<img>` posée sur un site tiers.
 */
export function LogoutButton({ className, locale = "fr" }: { className?: string; locale?: string }) {
  return (
    <form action={`/api/auth/sign-out?langue=${locale}`} method="post" className={className}>
      <Button type="submit" variant="secondary" size="sm">
        Déconnexion
      </Button>
    </form>
  );
}
