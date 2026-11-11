package com.collector.collection.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCollectibleRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 60) String category,
        @Size(max = 1000) String description
) {
}
