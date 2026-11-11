package com.collector.collection.api.dto;

import com.collector.collection.domain.ItemCondition;
import com.collector.collection.domain.ListingStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record CollectibleResponse(
        UUID id,
        UUID ownerId,
        String name,
        String category,
        String description,
        BigDecimal price,
        BigDecimal shippingCost,
        ItemCondition condition,
        ListingStatus status
) {
}
