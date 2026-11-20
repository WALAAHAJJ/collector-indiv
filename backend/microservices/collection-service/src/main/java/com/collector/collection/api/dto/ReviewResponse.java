package com.collector.collection.api.dto;

import com.collector.collection.domain.Review;

import java.time.Instant;
import java.util.UUID;

public record ReviewResponse(
        UUID id,
        UUID orderId,
        UUID buyerId,
        UUID sellerId,
        int rating,
        String comment,
        Instant createdAt
) {

    public static ReviewResponse from(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getOrderId(),
                review.getBuyerId(),
                review.getSellerId(),
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }
}
