package com.collector.collection.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "collectibles")
public class Collectible {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull
    @Column(nullable = false)
    private UUID ownerId;

    @NotBlank
    @Size(max = 120)
    @Column(nullable = false, length = 120)
    private String name;

    @NotBlank
    @Size(max = 60)
    @Column(nullable = false, length = 60)
    private String category;

    @Size(max = 1000)
    @Column(length = 1000)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2, columnDefinition = "numeric(10,2) default 0")
    private BigDecimal price;

    @Column(nullable = false, precision = 10, scale = 2, columnDefinition = "numeric(10,2) default 0")
    private BigDecimal shippingCost;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_condition", nullable = false, columnDefinition = "varchar(20) default 'GOOD'")
    private ItemCondition condition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(20) default 'PENDING_REVIEW'")
    private ListingStatus status = ListingStatus.PENDING_REVIEW;

    @Column(length = 255)
    private String moderationReason;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean hasPhoto;

    protected Collectible() {
    }

    public Collectible(
            UUID ownerId,
            String name,
            String category,
            String description,
            BigDecimal price,
            BigDecimal shippingCost,
            ItemCondition condition
    ) {
        this.ownerId = ownerId;
        this.name = name;
        this.category = category;
        this.description = description;
        this.price = price;
        this.shippingCost = shippingCost;
        this.condition = condition;
    }

    public void updateDetails(
            String name,
            String category,
            String description,
            BigDecimal price,
            BigDecimal shippingCost,
            ItemCondition condition
    ) {
        this.name = name;
        this.category = category;
        this.description = description;
        this.price = price;
        this.shippingCost = shippingCost;
        this.condition = condition;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public String getName() {
        return name;
    }

    public String getCategory() {
        return category;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public BigDecimal getShippingCost() {
        return shippingCost;
    }

    public ItemCondition getCondition() {
        return condition;
    }

    public ListingStatus getStatus() {
        return status;
    }

    public String getModerationReason() {
        return moderationReason;
    }

    public void applyModeration(ListingStatus status, String reason) {
        this.status = status;
        this.moderationReason = reason;
    }

    public boolean hasPhoto() {
        return hasPhoto;
    }

    public void markPhoto(boolean present) {
        this.hasPhoto = present;
    }
}
