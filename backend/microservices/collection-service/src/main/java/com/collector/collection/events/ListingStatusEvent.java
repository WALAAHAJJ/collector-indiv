package com.collector.collection.events;

import com.collector.collection.domain.ListingStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Fait qui vient de se produire : une annonce a pris un nouveau statut
 * (publiée, refusée ou en attente de vérification).
 */
public record ListingStatusEvent(
        UUID listingId,
        UUID ownerId,
        String listingName,
        ListingStatus status,
        String reason,
        Instant occurredAt
) {
}
