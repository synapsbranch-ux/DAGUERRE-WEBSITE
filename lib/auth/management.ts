/**
 * Client de la Management API de Logto.
 *
 * Sert deux besoins que la revendication du jeton ne couvre pas : lister des
 * comptes que personne n'a encore consultés, et **écrire** l'attribution des
 * rôles depuis le tableau de bord. L'authentification se fait par une
 * application machine-à-machine dédiée, jamais avec les identifiants de
 * l'application web.
 *
 * Comme le service de courriel, ce module **échoue explicitement** quand il
 * n'est pas configuré. Rendre un succès silencieux ferait croire à un
 * changement de rôle qui n'a pas eu lieu — le pire résultat possible pour une
 * opération de sécurité.
 */

type TokenCache = { token: string; expiresAt: number };

const globalForLogto = globalThis as typeof globalThis & {
  __logtoManagementToken?: TokenCache;
  __logtoRoleIds?: { at: number; byName: Map<string, string> };
};

/** Marge avant expiration : un jeton qui expire pendant l'appel serait rejeté. */
const EXPIRY_MARGIN_SECONDS = 60;

/** Les rôles changent rarement ; les relire à chaque appel serait du gaspillage. */
const ROLE_CACHE_TTL_MS = 5 * 60 * 1000;

export class LogtoManagementError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LogtoManagementError";
  }
}

function config() {
  const endpoint = process.env.LOGTO_ENDPOINT;
  const appId = process.env.LOGTO_M2M_APP_ID;
  const appSecret = process.env.LOGTO_M2M_APP_SECRET;
  const resource = process.env.LOGTO_MANAGEMENT_RESOURCE || "https://default.logto.app/api";

  if (!endpoint || !appId || !appSecret) {
    throw new LogtoManagementError(
      "LOGTO_ENDPOINT, LOGTO_M2M_APP_ID et LOGTO_M2M_APP_SECRET sont requis pour la Management API.",
      503,
    );
  }

  return { endpoint: endpoint.replace(/\/+$/, ""), appId, appSecret, resource };
}

/** `true` si l'application M2M est configurée — pour dégrader proprement. */
export function isManagementConfigured(): boolean {
  return Boolean(
    process.env.LOGTO_ENDPOINT && process.env.LOGTO_M2M_APP_ID && process.env.LOGTO_M2M_APP_SECRET,
  );
}

/**
 * Jeton d'accès `client_credentials`, mis en cache jusqu'à son expiration.
 *
 * Logto plafonne la fréquence de délivrance : en redemander un à chaque requête
 * finirait par se faire refuser.
 */
async function accessToken(): Promise<string> {
  const cached = globalForLogto.__logtoManagementToken;
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - EXPIRY_MARGIN_SECONDS > now) return cached.token;

  const { endpoint, appId, appSecret, resource } = config();

  const response = await fetch(`${endpoint}/oidc/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      // Les identifiants voyagent dans l'en-tête, jamais dans le corps ni l'URL,
      // où ils finiraient dans les journaux d'accès.
      authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      resource,
      scope: "all",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    // Le corps peut contenir un écho des identifiants : on ne le journalise pas.
    throw new LogtoManagementError(
      `Jeton Management API refusé (${response.status}).`,
      response.status === 401 ? 503 : 502,
    );
  }

  const payload = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
  const token = typeof payload.access_token === "string" ? payload.access_token : "";
  if (!token) throw new LogtoManagementError("Réponse de jeton illisible.", 502);

  const lifetime = typeof payload.expires_in === "number" ? payload.expires_in : 3600;
  globalForLogto.__logtoManagementToken = { token, expiresAt: now + lifetime };

  return token;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { endpoint } = config();
  const token = await accessToken();

  const response = await fetch(`${endpoint}/api${path}`, {
    ...init,
    headers: {
      ...init.headers,
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
    cache: "no-store",
  });

  if (response.status === 404) throw new LogtoManagementError("Introuvable dans Logto.", 404);
  if (!response.ok) {
    throw new LogtoManagementError(`Management API : ${response.status}.`, 502);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* ------------------------------------------------------------------ */
/* Utilisateurs                                                        */
/* ------------------------------------------------------------------ */

export type LogtoUser = {
  id: string;
  primaryEmail: string | null;
  name: string | null;
  username: string | null;
  isSuspended: boolean;
};

type RawUser = {
  id?: unknown;
  primaryEmail?: unknown;
  name?: unknown;
  username?: unknown;
  isSuspended?: unknown;
};

function toUser(raw: RawUser): LogtoUser | null {
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!id) return null;
  return {
    id,
    primaryEmail: typeof raw.primaryEmail === "string" ? raw.primaryEmail.toLowerCase() : null,
    name: typeof raw.name === "string" ? raw.name : null,
    username: typeof raw.username === "string" ? raw.username : null,
    isSuspended: raw.isSuspended === true,
  };
}

/** Une page d'utilisateurs. `page` commence à 1, comme l'attend Logto. */
export async function listUsers(options: { page?: number; pageSize?: number; search?: string } = {}) {
  const params = new URLSearchParams({
    page: String(Math.max(1, options.page ?? 1)),
    page_size: String(Math.min(100, Math.max(1, options.pageSize ?? 100))),
  });
  if (options.search) params.set("search", options.search);

  const raw = await call<RawUser[]>(`/users?${params.toString()}`);
  return raw.map(toUser).filter((user): user is LogtoUser => user !== null);
}

export async function getUser(id: string): Promise<LogtoUser | null> {
  try {
    return toUser(await call<RawUser>(`/users/${encodeURIComponent(id)}`));
  } catch (error) {
    if (error instanceof LogtoManagementError && error.status === 404) return null;
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/* Rôles                                                               */
/* ------------------------------------------------------------------ */

type RawRole = { id?: unknown; name?: unknown };

/** Correspondance nom → identifiant de rôle, mise en cache brièvement. */
async function roleIdsByName(): Promise<Map<string, string>> {
  const cached = globalForLogto.__logtoRoleIds;
  if (cached && Date.now() - cached.at < ROLE_CACHE_TTL_MS) return cached.byName;

  const raw = await call<RawRole[]>("/roles?page=1&page_size=100");
  const byName = new Map<string, string>();
  for (const role of raw) {
    if (typeof role.id === "string" && typeof role.name === "string") byName.set(role.name, role.id);
  }

  globalForLogto.__logtoRoleIds = { at: Date.now(), byName };
  return byName;
}

export async function roleIdForName(name: string): Promise<string> {
  const id = (await roleIdsByName()).get(name);
  if (!id) {
    throw new LogtoManagementError(
      `Le rôle « ${name} » n'existe pas dans Logto. Créez-le dans la console avant d'attribuer ce rôle.`,
      422,
    );
  }
  return id;
}

export async function getUserRoleNames(userId: string): Promise<string[]> {
  const raw = await call<RawRole[]>(`/users/${encodeURIComponent(userId)}/roles`);
  return raw.map((role) => (typeof role.name === "string" ? role.name : "")).filter(Boolean);
}

/**
 * Remplace **l'ensemble** des rôles de l'utilisateur.
 *
 * `PUT` et non `POST` : `POST` ajoute sans retirer, ce qui laisserait un ancien
 * administrateur administrateur après sa rétrogradation.
 */
export async function setUserRoles(userId: string, roleIds: string[]): Promise<void> {
  await call<unknown>(`/users/${encodeURIComponent(userId)}/roles`, {
    method: "PUT",
    body: JSON.stringify({ roleIds }),
  });
}
