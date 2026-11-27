import { photoUrl } from "./api";
import { getToken } from "./auth";
import { tr } from "./i18n";

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function failure(status: number, fallback: string): Error {
  if (status === 401) return new Error(tr("errSession"));
  if (status === 403) return new Error(tr("errPhoto403"));
  if (status === 413) return new Error(tr("errPhoto413"));
  if (status === 400) {
    return new Error(tr("errPhotoFormat"));
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
    throw failure(response.status, tr("errPhotoSend"));
  }
}

export async function removePhoto(listingId: string): Promise<void> {
  const response = await fetch(photoUrl(listingId), {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw failure(response.status, tr("errPhotoDelete"));
  }
}
