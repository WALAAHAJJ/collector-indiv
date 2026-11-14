import { useEffect, useState, type ReactNode } from "react";
import { photoUrl } from "./api";
import { getToken } from "./auth";

type ListingPhotoProps = Readonly<{
  listingId: string;
  alt: string;
  className?: string;
  /** Change quand la photo est remplacée, pour la recharger. */
  version?: number;
  /** Affiché tant que la photo n'est pas chargée, ou si elle ne peut pas l'être. */
  fallback: ReactNode;
}>;

/**
 * Photo d'une annonce lue avec le jeton de l'utilisateur : elle sert aux annonces
 * en attente ou refusées, que seuls leur propriétaire et l'administrateur peuvent voir.
 */
export default function ListingPhoto({
  listingId,
  alt,
  className,
  version = 0,
  fallback,
}: ListingPhotoProps) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const token = getToken();

    fetch(photoUrl(listingId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (response) => {
        if (!response.ok) return null;

        return await response.blob();
      })
      .then((blob) => {
        if (cancelled || !blob) return;

        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => {
        // La photo reste remplacée par l'illustration.
      });

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [listingId, version]);

  if (!source) {
    return <>{fallback}</>;
  }

  return <img className={className} src={source} alt={alt} />;
}
