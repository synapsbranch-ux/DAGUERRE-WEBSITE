import { MongoClient } from "mongodb";
import { hashPassword } from "better-auth/crypto";

/**
 * Création du premier administrateur.
 *
 * L'adaptateur MongoDB de Better Auth expose l'`_id` du document `user` comme
 * identifiant de compte : c'est donc cet `_id` — et non un UUID inventé ici —
 * que la ligne `account` doit référencer. Un `userId` sans correspondance
 * laisse un utilisateur sans mot de passe, incapable de se connecter.
 */
const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = "Administrateur" } = process.env;
if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("MONGODB_URI, ADMIN_EMAIL et ADMIN_PASSWORD sont requis.");
if (String(ADMIN_PASSWORD).length < 10) throw new Error("Le mot de passe doit compter au moins 10 caractères.");

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db();

const email = ADMIN_EMAIL.toLowerCase();
if (await db.collection("user").findOne({ email })) throw new Error("Cet administrateur existe déjà.");

const now = new Date();
const { insertedId } = await db.collection("user").insertOne({
  name: ADMIN_NAME,
  email,
  emailVerified: true,
  role: "admin",
  createdAt: now,
  updatedAt: now,
});

// `account.userId` référence `user.id` : l'adaptateur le convertit en
// ObjectId à chaque requête, la valeur stockée doit donc en être un.
await db.collection("account").insertOne({
  accountId: insertedId.toString(),
  providerId: "credential",
  userId: insertedId,
  password: await hashPassword(ADMIN_PASSWORD),
  createdAt: now,
  updatedAt: now,
});

await client.close();
console.log(`Administrateur créé : ${email}`);
