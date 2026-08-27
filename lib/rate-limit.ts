import { createClient, type RedisClientType } from "redis";

/**
 * Limitation de débit à fenêtre glissante.
 *
 * ## Pourquoi un magasin partagé
 *
 * La version précédente comptait dans une `Map` du processus. Avec N instances
 * — plusieurs conteneurs, ou une plate-forme sans serveur qui en démarre à la
 * demande — chaque instance tenait son propre compteur : la limite réelle
 * valait N fois la limite annoncée, et un attaquant n'avait qu'à répartir ses
 * requêtes pour l'annuler entièrement.
 *
 * ## Atomicité
 *
 * Compter puis insérer en deux appels laisse une fenêtre pendant laquelle deux
 * requêtes simultanées lisent le même total et passent toutes les deux. Le
 * script Lua ci-dessous fait les deux en une seule exécution côté serveur
 * Redis, qui est mono-fil : la course n'existe pas.
 *
 * ## Repli
 *
 * Sans Redis configuré, on retombe sur le compteur en mémoire, avec un
 * avertissement au démarrage. Le développement local ne doit pas exiger une
 * infrastructure ; la production, si — d'où l'avertissement plutôt qu'un
 * silence.
 *
 * Si Redis est configuré mais injoignable, la requête est **autorisée**. Un
 * magasin de limitation en panne ne doit pas fermer le site : refuser tout
 * transformerait une panne d'infrastructure secondaire en interruption totale.
 * L'incident est journalisé.
 */

/**
 * Fenêtre glissante atomique.
 *
 * `ZREMRANGEBYSCORE` purge les frappes sorties de la fenêtre, `ZCARD` compte
 * celles qui restent, et l'insertion n'a lieu que sous la limite. `PEXPIRE`
 * garantit qu'une clé inactive disparaît d'elle-même — sans quoi Redis
 * accumulerait une entrée par adresse vue depuis le premier jour.
 */
const SCRIPT = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, now - window)
if redis.call('ZCARD', KEYS[1]) >= limit then
  return 0
end
redis.call('ZADD', KEYS[1], now, ARGV[4])
redis.call('PEXPIRE', KEYS[1], window)
return 1
`;

const PREFIX = "ratelimit:";

type Cache = {
  client?: RedisClientType;
  connecting?: Promise<RedisClientType | null>;
  warned?: boolean;
};

// Le rechargement à chaud réévalue les modules : sans ce cache posé sur
// `globalThis`, chaque modification ouvrirait une connexion de plus.
const globalForRedis = globalThis as typeof globalThis & { __rateLimitRedis?: Cache };
const cache: Cache = (globalForRedis.__rateLimitRedis ??= {});

/* ------------------------------------------------------------------ */
/* Repli en mémoire                                                    */
/* ------------------------------------------------------------------ */

type Entry = { hits: number[] };
const memory = new Map<string, Entry>();

function memoryWindow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = memory.get(key) ?? { hits: [] };
  entry.hits = entry.hits.filter((time) => time > now - windowMs);

  if (entry.hits.length >= limit) {
    memory.set(key, entry);
    return false;
  }

  entry.hits.push(now);
  memory.set(key, entry);
  return true;
}

/* ------------------------------------------------------------------ */
/* Redis                                                               */
/* ------------------------------------------------------------------ */

/** `true` si un magasin partagé est configuré. */
export function isSharedRateLimitConfigured(): boolean {
  return Boolean(
    process.env.REDIS_URL || (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  );
}

async function redis(): Promise<RedisClientType | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (cache.client?.isReady) return cache.client;

  cache.connecting ??= (async () => {
    try {
      const client = createClient({ url }) as RedisClientType;
      // Sans écouteur, une erreur de socket devient une exception non capturée
      // qui met fin au processus.
      client.on("error", (error) => console.error("[rate-limit] Redis :", error));
      await client.connect();
      cache.client = client;
      return client;
    } catch (error) {
      console.error("[rate-limit] connexion Redis impossible :", error);
      // Sans cette remise à zéro, une première tentative échouée serait mise en
      // cache et toutes les suivantes rejetteraient la même promesse.
      cache.connecting = undefined;
      return null;
    }
  })();

  return cache.connecting;
}

/** Upstash expose Redis en HTTPS : utile là où une socket TCP n'est pas tenable. */
async function upstash(key: string, limit: number, windowMs: number): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const response = await fetch(`${url.replace(/\/+$/, "")}/eval`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify([SCRIPT, 1, PREFIX + key, String(Date.now()), String(windowMs), String(limit), member()]),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Upstash : ${response.status}`);

  const payload = (await response.json()) as { result?: unknown };
  return payload.result === 1;
}

/** Membre unique de l'ensemble trié : deux frappes de la même milliseconde comptent double. */
function member(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------------------------------------------ */
/* Interface publique                                                  */
/* ------------------------------------------------------------------ */

/**
 * Enregistre une frappe et dit si elle est autorisée.
 *
 * `false` signifie « limite atteinte » — l'appelant doit répondre 429.
 */
export async function slidingWindow(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!isSharedRateLimitConfigured()) {
    if (!cache.warned) {
      cache.warned = true;
      console.warn(
        "[rate-limit] Aucun magasin partagé configuré : la limitation est locale au processus " +
          "et ne tient pas sur plusieurs instances. Renseignez REDIS_URL en production.",
      );
    }
    return memoryWindow(key, limit, windowMs);
  }

  try {
    const viaUpstash = await upstash(key, limit, windowMs);
    if (viaUpstash !== null) return viaUpstash;

    const client = await redis();
    if (!client) return memoryWindow(key, limit, windowMs);

    const allowed = await client.eval(SCRIPT, {
      keys: [PREFIX + key],
      arguments: [String(Date.now()), String(windowMs), String(limit), member()],
    });

    return allowed === 1;
  } catch (error) {
    // Une panne du magasin de limitation ne doit pas fermer le site.
    console.error("[rate-limit] vérification impossible, requête autorisée :", error);
    return true;
  }
}
