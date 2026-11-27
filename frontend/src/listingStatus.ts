import type { TextKey } from "./i18n";

export type ListingStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SOLD";

export const statusLabels: Record<ListingStatus, string> = {
  PENDING_REVIEW: "En attente de vérification",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
  SOLD: "Vendue",
};

/** Clés de traduction des statuts d'annonce (l'affichage passe par t). */
export const statusKeys: Record<ListingStatus, TextKey> = {
  PENDING_REVIEW: "statusPending",
  APPROVED: "statusApproved",
  REJECTED: "statusRejected",
  SOLD: "statusSold",
};
