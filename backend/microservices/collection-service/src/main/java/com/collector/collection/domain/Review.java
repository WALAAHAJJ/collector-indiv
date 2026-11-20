package com.collector.collection.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * L'avis d'un acheteur sur un vendeur, laissé une fois la commande reçue. Une commande ne reçoit
 * qu'un seul avis (colonne {@code order_id} unique) : on ne peut ni gonfler ni répéter sa note.
 */
@Entity
@Table(name = "reviews")
public class Review {

    public static final int MIN_RATING = 1;
    public static final int MAX_RATING = 5;
    public static final int MAX_COMMENT_LENGTH = 500;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private UUID orderId;

    @Column(nullable = false)
    private UUID buyerId;

    @Column(nullable = false)
    private UUID sellerId;

    @Column(nullable = false)
    private int rating;

    // « comment » est un mot réservé dans certaines bases : la colonne s'appelle « body ».
    @Column(name = "body", length = MAX_COMMENT_LENGTH)
    private String comment;

    @Column(nullable = false)
    private Instant createdAt;

    protected Review() {
    }

    public Review(UUID orderId, UUID buyerId, UUID sellerId, int rating, String comment) {
        if (rating < MIN_RATING || rating > MAX_RATING) {
            throw new IllegalArgumentException("La note doit être comprise entre 1 et 5.");
        }

        String cleaned = comment == null ? "" : comment.trim();

        if (cleaned.length() > MAX_COMMENT_LENGTH) {
            throw new IllegalArgumentException("Le commentaire est limité à 500 caractères.");
        }

        this.orderId = orderId;
        this.buyerId = buyerId;
        this.sellerId = sellerId;
        this.rating = rating;
        this.comment = cleaned.isEmpty() ? null : cleaned;
        // Microsecondes : PostgreSQL ne garde pas les nanosecondes.
        this.createdAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrderId() {
        return orderId;
    }

    public UUID getBuyerId() {
        return buyerId;
    }

    public UUID getSellerId() {
        return sellerId;
    }

    public int getRating() {
        return rating;
    }

    public String getComment() {
        return comment;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
