package com.collector.collection.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** Avis d'un acheteur : une note de 1 à 5 et, au choix, un commentaire de 500 caractères au plus. */
public record CreateReviewRequest(
        @Min(value = 1, message = "La note doit être comprise entre 1 et 5")
        @Max(value = 5, message = "La note doit être comprise entre 1 et 5") int rating,
        @Size(max = 500, message = "Le commentaire est limité à 500 caractères") String comment
) {
}
