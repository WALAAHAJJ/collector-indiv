package com.collector.collection.service;

import com.collector.collection.api.dto.CreateReviewRequest;
import com.collector.collection.api.dto.ReviewResponse;
import com.collector.collection.api.dto.SellerReviewsResponse;
import com.collector.collection.domain.OrderStatus;
import com.collector.collection.domain.PurchaseOrder;
import com.collector.collection.domain.Review;
import com.collector.collection.repository.OrderRepository;
import com.collector.collection.repository.ReviewRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class ReviewService {

    /** Nombre d'avis détaillés renvoyés avec la moyenne d'un vendeur. */
    static final int RECENT_REVIEWS = 20;

    private final OrderRepository orderRepository;
    private final ReviewRepository reviewRepository;

    public ReviewService(OrderRepository orderRepository, ReviewRepository reviewRepository) {
        this.orderRepository = orderRepository;
        this.reviewRepository = reviewRepository;
    }

    /** L'acheteur note le vendeur, une seule fois, après avoir confirmé la réception. */
    @Transactional
    public ReviewResponse create(UUID userId, UUID orderId, CreateReviewRequest request) {
        // Une commande n'est visible que de son acheteur et de son vendeur : pour les autres, elle n'existe pas.
        PurchaseOrder order = orderRepository.findById(orderId)
                .filter(found -> found.getBuyerId().equals(userId) || found.getSellerId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Objet introuvable"));

        if (!order.getBuyerId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul l'acheteur peut noter le vendeur.");
        }

        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vous pourrez noter le vendeur une fois la commande reçue.");
        }

        if (reviewRepository.existsByOrderId(orderId)) {
            throw alreadyReviewed();
        }

        try {
            Review review = new Review(orderId, userId, order.getSellerId(), request.rating(), request.comment());

            return ReviewResponse.from(reviewRepository.saveAndFlush(review));
        } catch (DataIntegrityViolationException exception) {
            // Deux envois simultanés : la contrainte d'unicité de la base départage.
            throw alreadyReviewed();
        }
    }

    /** Les avis laissés par l'utilisateur, pour savoir quelles commandes sont déjà notées. */
    @Transactional(readOnly = true)
    public List<ReviewResponse> writtenBy(UUID buyerId) {
        return reviewRepository.findByBuyerIdOrderByCreatedAtDesc(buyerId)
                .stream()
                .map(ReviewResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public SellerReviewsResponse forSeller(UUID sellerId) {
        List<Review> reviews = reviewRepository.findBySellerIdOrderByCreatedAtDesc(sellerId);

        Double average = reviews.isEmpty()
                ? null
                : Math.round(reviews.stream().mapToInt(Review::getRating).average().orElse(0) * 10) / 10.0;

        List<ReviewResponse> recent = reviews.stream()
                .limit(RECENT_REVIEWS)
                .map(ReviewResponse::from)
                .toList();

        return new SellerReviewsResponse(sellerId, average, reviews.size(), recent);
    }

    private ResponseStatusException alreadyReviewed() {
        return new ResponseStatusException(HttpStatus.CONFLICT, "Vous avez déjà noté cette commande.");
    }
}
