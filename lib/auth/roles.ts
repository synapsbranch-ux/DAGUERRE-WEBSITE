import { type Role } from "@/lib/platform/enums";

/**
 * Traduction de la revendication Logto en rôle applicatif.
 *
 * Logto place les rôles de l'utilisateur dans `roles` de l'ID token, à condition
 * que la portée `UserScope.Roles` soit demandée. La revendication est signée par
 * Logto : c'est la seule source de vérité de rôle acceptée par ce code.
 *
 * La traduction est **fermée** : seul le nom exact du rôle d'administration
 * ouvre le tableau de bord. Revendication absente, vide, mal typée, ou portant
 * un rôle inconnu — tout retombe sur `customer`. Un défaut de configuration côté
 * Logto dégrade donc les droits, il ne les élargit jamais.
 *
 * Ce module ne dépend d'aucun SDK, volontairement : la décision est le cœur du
 * contrôle d'accès et doit pouvoir être éprouvée sans serveur d'identité, comme
 * `lib/platform/pathname.ts` l'est pour les redirections.
 */

/**
 * Nom du rôle Logto qui ouvre le tableau de bord.
 *
 * Configurable pour que le nom choisi dans la console n'ait pas à être gravé
 * dans le code, mais avec une valeur par défaut : une variable oubliée ne doit
 * transformer ni tout le monde ni personne en administrateur.
 */
export function adminRoleName(): string {
  return process.env.LOGTO_ADMIN_ROLE || "admin";
}

export function roleFromClaims(claims: { roles?: unknown } | null | undefined): Role {
  const roles = claims?.roles;
  if (!Array.isArray(roles)) return "customer";
  return roles.includes(adminRoleName()) ? "admin" : "customer";
}
