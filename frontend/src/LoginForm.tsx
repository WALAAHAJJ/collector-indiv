import { useState, type FormEvent } from "react";
import { setToken } from "./auth";
import Modal from "./Modal";

type SessionUser = {
  id: string;
  username: string;
  email: string;
  role: string;
};

type LoginFormProps = {
  onClose: () => void;
  onLoggedIn: (user: SessionUser) => void;
  onShowRegistration: () => void;
};

function LoginForm({
  onClose,
  onLoggedIn,
  onShowRegistration,
}: Readonly<LoginFormProps>) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (response.status === 401) {
        throw new Error("Nom d’utilisateur ou mot de passe incorrect.");
      }

      const data = (await response.json()) as {
        accessToken?: string;
        user?: SessionUser;
      };

      if (!response.ok || !data.accessToken || !data.user) {
        throw new Error("La connexion a échoué.");
      }

      setToken(data.accessToken);
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
    <Modal
      onClose={onClose}
      titleId="login-title"
      backdropClassName="modal-backdrop"
      dialogClassName="listing-modal auth-modal"
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

        <button className="sell-button auth-submit" type="submit" disabled={submitting}>
          {submitting ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p className="auth-switch">
        Vous n’avez pas encore de compte ?{" "}
        <button type="button" onClick={onShowRegistration}>
          Créer un compte
        </button>
      </p>
    </Modal>
  );
}

export default LoginForm;