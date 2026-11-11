package com.collector.collection.api.dto;

import com.collector.collection.domain.ItemCondition;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record UpdateCollectibleRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 60) String category,
        @Size(max = 1000) String description,
        @NotNull @DecimalMin("0.01") @Digits(integer = 8, fraction = 2) BigDecimal price,
        @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal shippingCost,
        @NotNull ItemCondition condition
) {
}
