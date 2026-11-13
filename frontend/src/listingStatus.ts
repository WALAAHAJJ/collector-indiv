export type ListingStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";

export const statusLabels: Record<ListingStatus, string> = {
  PENDING_REVIEW: "En attente de vérification",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
};
