/**
 * Garde la connexion pendant un rechargement de page (F5) : les jetons sont conservés
 * dans sessionStorage pendant 5 minutes au plus, puis oubliés. Ils disparaissent aussi
 * à la fermeture de l'onglet et à la déconnexion.
 */
const KEY = "collector.session";
export const KEEP_MS = 5 * 60_000;

export type KeptSession = { token: string; refreshToken: string; idToken?: string };

export function keepSession(session: KeptSession, now = Date.now()): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...session, until: now + KEEP_MS }));
  } catch {
    // stockage indisponible : la personne devra simplement se reconnecter après un rechargement
  }
}

export function loadSession(now = Date.now()): KeptSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as KeptSession & { until?: number };
    if (!data.token || !data.refreshToken || !data.until || data.until < now) {
      forgetSession();
      return null;
    }
    return { token: data.token, refreshToken: data.refreshToken, idToken: data.idToken };
  } catch {
    return null;
  }
}

export function forgetSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // rien à faire
  }
}
