package com.collector.collection.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Fait qui vient de se produire : une annonce a été vendue et payée. */
public record SaleEvent(
        UUID orderId,
        UUID listingId,
        UUID sellerId,
        UUID buyerId,
        String listingName,
        BigDecimal sellerNet,
        Instant occurredAt
) {
}
