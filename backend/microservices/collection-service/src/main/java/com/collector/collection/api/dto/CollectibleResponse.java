package com.collector.collection.api.dto;

import java.util.UUID;

public record CollectibleResponse(
        UUID id,
        UUID ownerId,
        String name,
        String category,
        String description
) {
}
