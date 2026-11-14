import { useState, type FormEvent } from "react";
import { adminCategoryUrl } from "./api";
import { getToken } from "./auth";
import {
  ART_OPTIONS,
  visualForArt,
  type Category,
  type CategoryArtName,
} from "./categories";
import ObjectArt from "./ObjectArt";

type AdminCategoriesProps = Readonly<{
  categories: Category[];
  onChange: () => Promise<void> | void;
}>;

const MAX_NAME_LENGTH = 60;

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function failureMessage(status: number, action: "create" | "delete"): string {
  if (status === 401) return "Session expirée : reconnectez-vous.";
  if (status === 403) return "Accès réservé aux administrateurs.";
  if (status === 409) {
    return action === "create"
      ? "Cette catégorie existe déjà."
      : "Impossible de supprimer : des annonces utilisent cette catégorie.";
  }

  return "L’action a échoué. Réessayez.";
}

export default function AdminCategories({
  categories,
  onChange,
}: AdminCategoriesProps) {
  const [name, setName] = useState("");
  const [art, setArt] = useState<CategoryArtName>("OTHER");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function send(
    request: () => Promise<Response>,
    action: "create" | "delete",
    success: string,
  ): Promise<boolean> {
    try {
      const response = await request();

      if (!response.ok) {
        throw new Error(failureMessage(response.status, action));
      }

      await onChange();
      setError("");
      setMessage(success);

      return true;
    } catch (requestError: unknown) {
      setMessage("");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "L’action a échoué. Réessayez.",
      );

      return false;
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();

    if (trimmed === "") {
      setMessage("");
      setError("Indiquez le nom de la catégorie.");
      return;
    }

    const created = await send(
      () =>
        fetch(adminCategoryUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ name: trimmed, art }),
        }),
      "create",
      `Catégorie « ${trimmed} » créée.`,
    );

    if (created) {
      setName("");
      setArt("OTHER");
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`Supprimer la catégorie « ${category.name} » ?`)) {
      return;
    }

    await send(
      () =>
        fetch(adminCategoryUrl(category.id), {
          method: "DELETE",
          headers: authHeaders(),
        }),
      "delete",
      `Catégorie « ${category.name} » supprimée.`,
    );
  }

  return (
    <section aria-label="Catégories">
      {message && <output>{message}</output>}
      {error && <p role="alert">{error}</p>}

      <form className="admin-category-form" onSubmit={create}>
        <label>
          Nom de la catégorie
          <input
            required
            maxLength={MAX_NAME_LENGTH}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label>
          Illustration
          <select
            value={art}
            onChange={(event) => setArt(event.target.value as CategoryArtName)}
          >
            {ART_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button type="submit">Ajouter la catégorie</button>
      </form>

      <ul className="admin-category-list">
        {categories.map((category) => {
          const visual = visualForArt(category.art);

          return (
            <li className="admin-category-item" key={category.name}>
              <span className={`admin-category-art ${visual.tone}`} aria-hidden="true">
                <ObjectArt kind={visual.art} size={40} />
              </span>
              <span className="admin-category-name">{category.name}</span>
              {category.id && (
                <button
                  type="button"
                  className="delete-listing-button"
                  aria-label={`Supprimer la catégorie ${category.name}`}
                  onClick={() => remove(category)}
                >
                  Supprimer
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
