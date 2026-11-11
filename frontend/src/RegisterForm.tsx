import { useState } from "react";
import type { FormEvent } from "react";

type RegisterFormProps = {
  onClose: () => void;
  onRegistered: () => void;
};

export default function RegisterForm({
  onClose,
  onRegistered,
}: RegisterFormProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as Record<string, unknown>;
        const messages = Object.values(payload).flatMap((value) =>
          Array.isArray(value) ? value : [value],
        );
        const firstMessage = messages.find(
          (value): value is string => typeof value === "string",
        );

        setError(firstMessage ?? "Vérifie les informations saisies.");
        return;
      }

      onRegistered();
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-backdrop">
      <section
        className="auth-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-title"
      >
        <button
          className="auth-close"
          type="button"
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>

        <span className="eyebrow">REJOIGNEZ COLLECTOR</span>
        <h2 id="register-title">Créer un compte</h2>
        <p>Inscris-toi pour préparer tes achats et tes ventes.</p>

        <form onSubmit={handleSubmit}>
          <label>
            Nom d’utilisateur
            <input
              required
              minLength={3}
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label>
            Adresse e-mail
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Mot de passe
            <input
              required
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Création…" : "Créer mon compte"}
          </button>
        </form>
      </section>
    </div>
  );
}