import { MongoClient } from "mongodb";

/**
 * Remplissage et resynchronisation du miroir des comptes.
 *
 * Le tableau de bord lit `AppUser` pour lister et rechercher des clients.
 * Les notifications de Logto le tiennent à jour au fil de l'eau, mais elles ne
 * disent rien du passé : ce script parcourt les comptes existants et pose la
 * première photographie. À relancer après une panne de webhook, ou pour
 * réconcilier les rôles après une modification faite directement dans la
 * console Logto.
 *
 * Le rôle est relu depuis Logto pour chaque compte : c'est la seule façon de
 * réconcilier un rôle attribué hors de l'application. Cela reste un cache
 * d'affichage — aucun accès ne se décide dessus.
 *
 *   pnpm sync:users
 */

const {
  MONGODB_URI,
  LOGTO_ENDPOINT,
  LOGTO_M2M_APP_ID,
  LOGTO_M2M_APP_SECRET,
  LOGTO_MANAGEMENT_RESOURCE = "https://default.logto.app/api",
  LOGTO_ADMIN_ROLE = "admin",
} = process.env;

if (!MONGODB_URI) throw new Error("MONGODB_URI est requise.");
if (!LOGTO_ENDPOINT || !LOGTO_M2M_APP_ID || !LOGTO_M2M_APP_SECRET) {
  throw new Error(
    "LOGTO_ENDPOINT, LOGTO_M2M_APP_ID et LOGTO_M2M_APP_SECRET sont requis. " +
      "Créez une application machine-à-machine dans Logto et donnez-lui l'accès à la Management API.",
  );
}

const endpoint = LOGTO_ENDPOINT.replace(/\/+$/, "");

async function accessToken() {
  const response = await fetch(`${endpoint}/oidc/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${Buffer.from(`${LOGTO_M2M_APP_ID}:${LOGTO_M2M_APP_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      resource: LOGTO_MANAGEMENT_RESOURCE,
      scope: "all",
    }),
  });

  if (!response.ok) {
    // Le corps peut refléter les identifiants : on ne l'imprime pas.
    throw new Error(`Jeton Management API refusé (${response.status}).`);
  }

  const { access_token: token } = await response.json();
  if (!token) throw new Error("Réponse de jeton illisible.");
  return token;
}

const token = await accessToken();

async function api(path) {
  const response = await fetch(`${endpoint}/api${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Management API ${path} : ${response.status}.`);
  return response.json();
}

const client = new MongoClient(MONGODB_URI);
await client.connect();
const appUsers = client.db().collection("appusers");

let page = 1;
let seen = 0;
let admins = 0;

for (;;) {
  const users = await api(`/users?page=${page}&page_size=100`);
  if (!Array.isArray(users) || users.length === 0) break;

  for (const user of users) {
    if (typeof user?.id !== "string") continue;

    const roles = await api(`/users/${encodeURIComponent(user.id)}/roles`);
    const isAdmin =
      Array.isArray(roles) && roles.some((role) => role?.name === LOGTO_ADMIN_ROLE);
    if (isAdmin) admins += 1;

    const now = new Date();
    await appUsers.updateOne(
      { logtoId: user.id },
      {
        $set: {
          email: typeof user.primaryEmail === "string" ? user.primaryEmail.toLowerCase() : "",
          name: user.name || user.username || "",
          role: isAdmin ? "admin" : "customer",
          isSuspended: user.isSuspended === true,
          deletedAt: null,
          syncedAt: now,
          updatedAt: now,
        },
        $setOnInsert: { logtoId: user.id, createdAt: now },
      },
      { upsert: true },
    );

    seen += 1;
  }

  if (users.length < 100) break;
  page += 1;
}

await client.close();

console.log(`Comptes synchronisés : ${seen} (dont ${admins} administrateur${admins > 1 ? "s" : ""}).`);

if (admins === 0) {
  console.warn(
    `\nAucun compte ne porte le rôle « ${LOGTO_ADMIN_ROLE} » : personne ne peut ouvrir le tableau de bord.` +
      `\nCréez le rôle dans la console Logto et attribuez-le à votre compte.`,
  );
}
