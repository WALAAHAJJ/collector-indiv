package com.collector.notification.domain;

/** Ce qui s'est passé : une décision sur une annonce, ou la vente d'une annonce. */
public enum NotificationType {
    LISTING_APPROVED,
    LISTING_REJECTED,
    LISTING_PENDING_REVIEW,
    ORDER_SOLD
}
