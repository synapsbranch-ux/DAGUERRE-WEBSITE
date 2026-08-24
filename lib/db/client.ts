import mongoose from "mongoose";

/**
 * Connexion Mongoose partagée.
 *
 * En développement, le rechargement à chaud réévalue les modules à chaque
 * modification : sans ce cache posé sur `globalThis`, chaque rechargement
 * ouvrirait une nouvelle connexion jusqu'à saturer le pool du serveur.
 */

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  __mongooseCache?: MongooseCache;
};

const cache: MongooseCache = (globalForMongoose.__mongooseCache ??= {
  conn: null,
  promise: null,
});

/** `true` si une URI est configurée — permet de dégrader proprement sans base. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI n'est pas définie. Copiez .env.example vers .env.local et renseignez l'URI de connexion.",
    );
  }

  cache.promise ??= mongoose.connect(uri, {
    // Les requêtes échouent immédiatement plutôt que d'attendre le délai par
    // défaut de 30 s quand la base est injoignable.
    bufferCommands: false,
    serverSelectionTimeoutMS: 10_000,
  });

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Sans cette remise à zéro, une première tentative échouée serait mise en
    // cache et toutes les suivantes rejetteraient la même promesse.
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

/**
 * Connexion « souple » pour les pages publiques : renvoie `false` au lieu de
 * lever si la base n'est pas configurée ou injoignable. Le site reste alors
 * consultable avec ses contenus vides plutôt que de renvoyer une erreur 500.
 */
export async function tryConnectToDatabase(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    await connectToDatabase();
    return true;
  } catch (error) {
    console.error("[db] connexion impossible :", error);
    return false;
  }
}
