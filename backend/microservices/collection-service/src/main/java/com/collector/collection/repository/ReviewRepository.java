package com.collector.collection.repository;

import com.collector.collection.domain.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    boolean existsByOrderId(UUID orderId);

    List<Review> findBySellerIdOrderByCreatedAtDesc(UUID sellerId);

    List<Review> findByBuyerIdOrderByCreatedAtDesc(UUID buyerId);
}
