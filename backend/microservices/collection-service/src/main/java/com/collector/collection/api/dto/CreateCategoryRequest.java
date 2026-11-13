package com.collector.collection.api.dto;

import com.collector.collection.domain.CategoryArt;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequest(
        @NotBlank @Size(max = 60) String name,
        @NotNull CategoryArt art
) {
}
