package com.collector.notification.domain;

/** Ce qui s'est passé : une décision sur une annonce, la vente d'une annonce, ou une étape de la commande (expédiée, reçue). */
public enum NotificationType {
    LISTING_APPROVED,
    LISTING_REJECTED,
    LISTING_PENDING_REVIEW,
    ORDER_SOLD,
    ORDER_SHIPPED,
    ORDER_DELIVERED
}
