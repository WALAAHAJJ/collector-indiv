package com.collector.collection.api.dto;

import java.util.List;
import java.util.UUID;

/** Réputation d'un vendeur : moyenne arrondie au dixième (absente s'il n'a aucun avis), nombre d'avis et les plus récents. */
public record SellerReviewsResponse(
        UUID sellerId,
        Double average,
        int count,
        List<ReviewResponse> reviews
) {
}
