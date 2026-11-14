import Keycloak from "keycloak-js";
import { clearToken, setToken } from "./auth";

/**
 * Connexion par Keycloak : flux « code d'autorisation » avec PKCE (S256).
 * Le site n'a jamais le mot de passe : la saisie se fait sur la page de Keycloak, puis le site
 * reçoit un jeton d'accès de courte durée.
 */
const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8180",
  realm: import.meta.env.VITE_KEYCLOAK_REALM || "collector",
  clientId: "collector-web",
});

/** Le jeton dure 5 minutes : on le renouvelle quand il lui reste moins d'une minute. */
const REFRESH_CHECK_MS = 20_000;
const MIN_VALIDITY_SECONDS = 60;

let refreshTimer: number | undefined;

function publishToken(): void {
  if (keycloak.token) {
    setToken(keycloak.token);
  }
}

function keepTokenFresh(): void {
  window.clearInterval(refreshTimer);

  refreshTimer = window.setInterval(() => {
    keycloak
      .updateToken(MIN_VALIDITY_SECONDS)
      .then(publishToken)
      .catch(() => {
        // Session Keycloak terminée : on repasse en visiteur.
        clearToken();
        window.clearInterval(refreshTimer);
      });
  }, REFRESH_CHECK_MS);
}

/**
 * À appeler au démarrage du site. Si une session Keycloak est déjà ouverte, le jeton est récupéré
 * sans que la personne ait à se reconnecter. Si Keycloak est injoignable, le catalogue public reste utilisable.
 */
export async function initIdentity(): Promise<void> {
  try {
    const authenticated = await keycloak.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
      checkLoginIframe: false,
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      silentCheckSsoFallback: false,
      messageReceiveTimeout: 3000,
    });

    if (authenticated) {
      publishToken();
      keepTokenFresh();
    }
  } catch {
    clearToken();
  }
}

export function login(): Promise<void> {
  return keycloak.login();
}

export function register(): Promise<void> {
  return keycloak.register();
}

export function logout(): Promise<void> {
  clearToken();
  window.clearInterval(refreshTimer);

  return keycloak.logout({ redirectUri: window.location.origin });
}
