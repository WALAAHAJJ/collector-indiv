import { photoUrl } from "./api";
import { getToken } from "./auth";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function failure(status: number, fallback: string): Error {
  if (status === 401) return new Error("Session expirée : reconnectez-vous.");
  if (status === 403) return new Error("Vous ne pouvez pas modifier cette photo.");
  if (status === 413) return new Error("La photo dépasse 1 Mo.");
  if (status === 400) {
    return new Error("Format non pris en charge : JPEG, PNG ou WebP.");
  }

  return new Error(fallback);
}

/** Envoie (ou remplace) la photo d'une annonce de l'utilisateur connecté. */
export async function uploadPhoto(listingId: string, file: File): Promise<void> {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(photoUrl(listingId), {
    method: "POST",
    headers: authHeaders(),
    body,
  });

  if (!response.ok) {
    throw failure(response.status, "L’envoi de la photo a échoué.");
  }
}

export async function removePhoto(listingId: string): Promise<void> {
  const response = await fetch(photoUrl(listingId), {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw failure(response.status, "La suppression de la photo a échoué.");
  }
}
