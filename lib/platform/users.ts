import { tryConnectToDatabase } from "@/lib/db/client";
import { AppUserModel } from "@/lib/db/models/platform";
import { getUser, isManagementConfigured, type LogtoUser } from "@/lib/auth/management";
import { normalizeRole, type Role } from "@/lib/platform/enums";

/**
 * Lecture des comptes — miroir local des utilisateurs Logto.
 *
 * Les comptes appartiennent à Logto. Ce module ne fait que les *afficher* : il
 * lit le miroir `AppUser`, alimenté par les notifications du fournisseur et par
 * `scripts/sync-logto-users.mjs`, et se rabat sur la Management API pour un
 * compte que le miroir ne connaît pas encore.
 *
 * **Aucun mot de passe n'est lisible depuis ici, ni depuis nulle part ailleurs
 * dans ce dépôt.** Les identifiants ne quittent jamais Logto : un administrateur
 * ne peut ni consulter ni récupérer le mot de passe d'un client, seulement lui
 * faire envoyer un lien de réinitialisation par le fournisseur.
 *
 * Les signatures publiques sont inchangées depuis la bascule : les douze écrans
 * d'administration qui en dépendent n'ont pas eu à être touchés.
 */

export type AccountSummary = {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
};

type MirrorDoc = {
  logtoId?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  createdAt?: unknown;
};

function toSummary(doc: MirrorDoc): AccountSummary {
  return {
    id: String(doc.logtoId ?? ""),
    name: String(doc.name ?? ""),
    email: String(doc.email ?? ""),
    role: normalizeRole(doc.role),
    /*
     * La vérification d'adresse appartient au parcours Logto. Le miroir ne la
     * suit pas : l'afficher ici donnerait une valeur périmée dès la vérification
     * suivante. Seule la session en porte l'état à jour.
     */
    emailVerified: true,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : "",
  };
}

function fromLogto(user: LogtoUser, role: Role): AccountSummary {
  return {
    id: user.id,
    name: user.name || user.username || user.primaryEmail || "",
    email: user.primaryEmail ?? "",
    role,
    emailVerified: true,
    createdAt: "",
  };
}

/**
 * Ajoute au miroir un compte qu'on vient de résoudre chez Logto.
 *
 * Au mieux : un miroir qui refuse une écriture ne doit pas faire échouer
 * l'affichage de la page qui l'a déclenchée.
 */
async function remember(user: LogtoUser, role: Role): Promise<void> {
  try {
    await AppUserModel.updateOne(
      { logtoId: user.id },
      {
        $set: {
          email: user.primaryEmail ?? "",
          name: user.name || user.username || "",
          isSuspended: user.isSuspended,
          syncedAt: new Date(),
        },
        $setOnInsert: { logtoId: user.id, role },
      },
      { upsert: true },
    );
  } catch (error) {
    console.error("[comptes] mise en cache impossible :", error);
  }
}

/** Comptes clients, éventuellement filtrés par nom ou courriel. */
export async function listClientAccounts(
  options: { query?: string; page?: number; limit?: number } = {},
): Promise<{ items: AccountSummary[]; total: number }> {
  if (!(await tryConnectToDatabase())) return { items: [], total: 0 };

  const { query = "", page = 1, limit = 25 } = options;
  const filter: Record<string, unknown> = { role: "customer", deletedAt: null };

  if (query) {
    // La saisie est échappée : un `.` ou un `*` tapé dans la recherche est un
    // caractère, pas un motif.
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [docs, total] = await Promise.all([
    AppUserModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((Math.max(1, page) - 1) * limit)
      .limit(limit)
      .lean(),
    AppUserModel.countDocuments(filter),
  ]);

  return { items: (docs as MirrorDoc[]).map(toSummary), total };
}

/** Fiche d'un compte, ou `null`. */
export async function findAccount(id: string): Promise<AccountSummary | null> {
  if (!id) return null;

  if (await tryConnectToDatabase()) {
    const doc = (await AppUserModel.findOne({ logtoId: id }).lean()) as MirrorDoc | null;
    if (doc) return toSummary(doc);
  }

  // Absent du miroir : compte tout juste créé, ou notification manquée.
  if (!isManagementConfigured()) return null;

  try {
    const user = await getUser(id);
    if (!user) return null;
    await remember(user, "customer");
    return fromLogto(user, "customer");
  } catch (error) {
    console.error("[comptes] résolution impossible :", error);
    return null;
  }
}

/** Résout plusieurs comptes en une requête — pour annoter une liste. */
export async function accountsById(ids: string[]): Promise<Map<string, AccountSummary>> {
  const wanted = [...new Set(ids.filter(Boolean))];
  if (wanted.length === 0 || !(await tryConnectToDatabase())) return new Map();

  const docs = (await AppUserModel.find({ logtoId: { $in: wanted } }).lean()) as MirrorDoc[];
  const found = new Map(docs.map((doc) => [String(doc.logtoId ?? ""), toSummary(doc)]));

  /*
   * Les absents sont résolus un par un chez Logto — au plus une poignée en
   * pratique, puisque le miroir est alimenté en continu. La borne évite qu'un
   * miroir vide déclenche cent appels réseau pour peindre un tableau.
   */
  if (isManagementConfigured()) {
    const missing = wanted.filter((id) => !found.has(id)).slice(0, 25);
    for (const id of missing) {
      try {
        const user = await getUser(id);
        if (!user) continue;
        await remember(user, "customer");
        found.set(id, fromLogto(user, "customer"));
      } catch (error) {
        console.error("[comptes] résolution impossible :", error);
      }
    }
  }

  return found;
}

/** Libellé lisible d'un compte : « Nom (courriel) ». */
export function accountLabel(account: AccountSummary): string {
  return account.name ? `${account.name} (${account.email})` : account.email;
}
