/** Taille maximale acceptée par le serveur : 1 Mo. */
export const MAX_PHOTO_BYTES = 1024 * 1024;

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_SIDE = 1600;
const MAX_ATTEMPTS = 4;
const JPEG_QUALITY = 0.85;
const SHRINK_FACTOR = 0.7;

/** Message à afficher si la photo ne convient pas, ou `null` si elle convient. */
export function photoProblem(file: File): string | null {
  if (!PHOTO_TYPES.includes(file.type)) {
    return "Format non pris en charge : choisissez une photo JPEG, PNG ou WebP.";
  }

  if (file.size > MAX_PHOTO_BYTES) {
    return "La photo dépasse 1 Mo : choisissez-en une plus légère.";
  }

  return null;
}

function renamedAsJpeg(name: string): string {
  const dot = name.lastIndexOf(".");

  return `${dot > 0 ? name.slice(0, dot) : name}.jpg`;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
}

/**
 * Réduit une photo trop lourde (taille et qualité) pour qu'elle passe sous la limite.
 * Si le navigateur ne sait pas le faire, la photo est renvoyée telle quelle.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  if (file.size <= MAX_PHOTO_BYTES || !PHOTO_TYPES.includes(file.type)) {
    return file;
  }

  if (typeof createImageBitmap !== "function") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));

      const context = canvas.getContext("2d");

      if (!context) break;

      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await toBlob(canvas);

      if (blob && blob.size <= MAX_PHOTO_BYTES) {
        bitmap.close();
        return new File([blob], renamedAsJpeg(file.name), {
          type: "image/jpeg",
        });
      }

      scale *= SHRINK_FACTOR;
    }

    bitmap.close();
  } catch {
    // Photo illisible par le navigateur : le message d'erreur s'en chargera.
  }

  return file;
}
