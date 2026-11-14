/**
 * Jeton d'accès de la personne connectée, délivré par Keycloak.
 *
 * Il est gardé en mémoire uniquement, jamais dans sessionStorage ni localStorage : un script injecté
 * (faille XSS) ne peut pas le lire dans le stockage du navigateur. Après un rechargement de la page,
 * Keycloak le redonne silencieusement tant que la session SSO est ouverte (voir identity.ts).
 */
export type SessionUser = {
  id: string;
  username: string;
  email: string;
  role: string;
};

let token: string | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function getToken(): string | null {
  return token;
}

export function setToken(value: string): void {
  token = value;
  notify();
}

export function clearToken(): void {
  token = null;
  notify();
}

/** Permet à l'interface de se mettre à jour quand le jeton change (connexion, renouvellement, déconnexion). */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function decodePayload(value: string): Record<string, unknown> | null {
  const part = value.split(".")[1];
  if (!part) return null;

  try {
    const base64 = part.replaceAll("-", "+").replaceAll("_", "/");
    const bytes = Uint8Array.from(atob(base64), (char) => char.codePointAt(0) ?? 0);
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));

    return typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * Lit l'identité dans le jeton, pour l'affichage seulement : la signature n'est pas vérifiée ici,
 * ce sont les services qui la vérifient à chaque requête.
 */
export function userFromToken(value: string | null): SessionUser | null {
  if (!value) return null;

  const payload = decodePayload(value);
  const id = text(payload?.sub);
  if (!payload || !id) return null;

  const realmAccess = payload.realm_access as { roles?: unknown } | undefined;
  const roles = Array.isArray(realmAccess?.roles) ? realmAccess.roles : [];

  return {
    id,
    username: text(payload.preferred_username),
    email: text(payload.email),
    role: roles.includes("ADMIN") ? "ADMIN" : "USER",
  };
}
