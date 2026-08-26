import mongoose from "mongoose";
import { ObjectId } from "mongodb";

import { normalizeRole, type Role } from "@/lib/platform/enums";

/**
 * Lecture des comptes gérés par Better Auth.
 *
 * La collection `user` appartient à Better Auth : lui superposer un modèle
 * Mongoose créerait un second schéma capable de diverger du sien à la
 * première mise à jour. On lit donc la collection directement, en lecture
 * seule, et on ne renvoie que les champs dont le tableau de bord a besoin.
 *
 * **Le mot de passe n'est pas dans cette collection** — il vit dans `account`,
 * haché — et aucune fonction d'ici ne le touche : un administrateur ne doit
 * jamais pouvoir consulter ni récupérer le mot de passe d'un client.
 */

export type AccountSummary = {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
};

type UserDoc = {
  _id: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  emailVerified?: unknown;
  createdAt?: unknown;
};

function collection() {
  const db = mongoose.connection.db;
  return db ? db.collection<UserDoc>("user") : null;
}

function toSummary(doc: UserDoc): AccountSummary {
  return {
    id: String(doc._id),
    name: String(doc.name ?? ""),
    email: String(doc.email ?? ""),
    role: normalizeRole(doc.role),
    emailVerified: doc.emailVerified === true,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : "",
  };
}

/** Comptes clients, éventuellement filtrés par nom ou courriel. */
export async function listClientAccounts(options: {
  query?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ items: AccountSummary[]; total: number }> {
  const users = collection();
  if (!users) return { items: [], total: 0 };

  const { query = "", page = 1, limit = 25 } = options;
  const filter: Record<string, unknown> = { role: { $ne: "admin" } };

  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [docs, total] = await Promise.all([
    users
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    users.countDocuments(filter),
  ]);

  return { items: docs.map(toSummary), total };
}

/** Fiche d'un compte, ou `null`. */
export async function findAccount(id: string): Promise<AccountSummary | null> {
  const users = collection();
  if (!users || !ObjectId.isValid(id)) return null;

  const doc = await users.findOne({ _id: new ObjectId(id) } as never);
  return doc ? toSummary(doc as UserDoc) : null;
}

/** Résout plusieurs comptes en une requête — pour annoter une liste. */
export async function accountsById(ids: string[]): Promise<Map<string, AccountSummary>> {
  const users = collection();
  const valid = ids.filter((value) => ObjectId.isValid(value));
  if (!users || valid.length === 0) return new Map();

  const docs = await users
    .find({ _id: { $in: valid.map((value) => new ObjectId(value)) } } as never)
    .toArray();

  return new Map(docs.map((doc) => [String(doc._id), toSummary(doc as UserDoc)]));
}

/** Libellé lisible d'un compte : « Nom (courriel) ». */
export function accountLabel(account: AccountSummary): string {
  return account.name ? `${account.name} (${account.email})` : account.email;
}
