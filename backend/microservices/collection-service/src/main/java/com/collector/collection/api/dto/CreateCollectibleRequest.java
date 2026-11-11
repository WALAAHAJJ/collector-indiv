package com.collector.collection.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateCollectibleRequest(
        @NotNull UUID ownerId,
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 60) String category,
        @Size(max = 1000) String description
) {
}
