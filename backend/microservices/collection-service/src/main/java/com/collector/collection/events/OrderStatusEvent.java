package com.collector.collection.events;

import com.collector.collection.domain.OrderStatus;

import java.time.Instant;
import java.util.UUID;

/** Fait qui vient de se produire : une commande a été expédiée (SHIPPED) ou reçue (DELIVERED). */
public record OrderStatusEvent(
        UUID orderId,
        UUID listingId,
        UUID buyerId,
        UUID sellerId,
        String listingName,
        OrderStatus status,
        Instant occurredAt
) {
}
