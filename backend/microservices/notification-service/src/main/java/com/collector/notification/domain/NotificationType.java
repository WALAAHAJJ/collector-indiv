package com.collector.notification.domain;

/** Ce qui s'est passé : une décision sur une annonce, la vente d'une annonce, son paiement côté acheteur, ou une étape de la commande (expédiée, reçue, remboursée). */
public enum NotificationType {
    LISTING_APPROVED,
    LISTING_REJECTED,
    LISTING_PENDING_REVIEW,
    ORDER_SOLD,
    ORDER_PAID,
    ORDER_SHIPPED,
    ORDER_DELIVERED,
    ORDER_REFUNDED
}
