import { useState, type FormEvent } from "react";

type SessionUser = {
  id: number;
  username: string;
  email: string;
};

type LoginFormProps = {
  onClose: () => void;
  onLoggedIn: (user: SessionUser) => void;
  onShowRegistration: () => void;
};

function getCookie(name: string): string | null {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`));

  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
}

function LoginForm({
  onClose,
  onLoggedIn,
  onShowRegistration,
}: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const csrfResponse = await fetch("/api/auth/csrf/", {
        credentials: "include",
      });

      if (!csrfResponse.ok) {
        throw new Error("Impossible de préparer la connexion.");
      }

      const csrfToken = getCookie("csrftoken");

      if (!csrfToken) {
        throw new Error("Le jeton de sécurité est introuvable. Réessaie.");
      }

      const response = await fetch("/api/auth/login/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as {
        user?: SessionUser;
        detail?: string;
      };

      if (!response.ok || !data.user) {
        throw new Error(data.detail ?? "La connexion a échoué.");
      }

      onLoggedIn(data.user);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Une erreur est survenue. Réessaie.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="listing-modal auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>

        <span className="eyebrow">HEUREUSE DE VOUS REVOIR</span>
        <h2 id="login-title">Se connecter</h2>
        <p>Connectez-vous pour retrouver votre espace Collector.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Nom d’utilisateur
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button className="sell-button auth-submit" disabled={submitting}>
            {submitting ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="auth-switch">
          Vous n’avez pas encore de compte ?{" "}
          <button type="button" onClick={onShowRegistration}>
            Créer un compte
          </button>
        </p>
      </section>
    </div>
  );
}

export default LoginForm;