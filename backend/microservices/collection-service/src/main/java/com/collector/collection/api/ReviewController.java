package com.collector.collection.api;

import com.collector.collection.api.dto.CreateReviewRequest;
import com.collector.collection.api.dto.ReviewResponse;
import com.collector.collection.api.dto.SellerReviewsResponse;
import com.collector.collection.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/** Avis sur les vendeurs. L'auteur est toujours celui du jeton ; la réputation d'un vendeur est publique. */
@RestController
@RequestMapping("/api")
public class ReviewController {

    private final ReviewService service;

    public ReviewController(ReviewService service) {
        this.service = service;
    }

    @PostMapping("/orders/{orderId}/review")
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse review(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId,
            @Valid @RequestBody CreateReviewRequest request
    ) {
        return service.create(currentUserId(jwt), orderId, request);
    }

    @GetMapping("/reviews/mine")
    public List<ReviewResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        return service.writtenBy(currentUserId(jwt));
    }

    @GetMapping("/sellers/{sellerId}/reviews")
    public SellerReviewsResponse sellerReviews(@PathVariable UUID sellerId) {
        return service.forSeller(sellerId);
    }

    private UUID currentUserId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Jeton invalide");
        }
    }
}
