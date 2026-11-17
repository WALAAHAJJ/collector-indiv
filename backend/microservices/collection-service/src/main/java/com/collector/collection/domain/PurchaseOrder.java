package com.collector.collection.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Un achat terminé. Les montants et le nom de l'annonce sont copiés au moment de la vente :
 * la commande reste exacte même si l'annonce change ou disparaît plus tard.
 *
 * <p>La table s'appelle « purchase_orders » : « order » est un mot réservé de SQL, et une entité nommée Order se mêle aux requêtes (ORDER BY).
 * Du numéro de carte, seuls les quatre derniers chiffres sont conservés.
 */
@Entity
@Table(name = "purchase_orders")
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID listingId;

    @Column(nullable = false, length = 120)
    private String listingName;

    @Column(nullable = false)
    private UUID buyerId;

    @Column(nullable = false)
    private UUID sellerId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal itemPrice;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal shippingCost;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal commission;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal buyerTotal;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal sellerNet;

    @Column(nullable = false, length = 4)
    private String cardLast4;

    @Column(nullable = false)
    private Instant createdAt;

    protected PurchaseOrder() {
    }

    public PurchaseOrder(
            UUID listingId,
            String listingName,
            UUID buyerId,
            UUID sellerId,
            BigDecimal itemPrice,
            BigDecimal shippingCost,
            BigDecimal commission,
            BigDecimal buyerTotal,
            BigDecimal sellerNet,
            String cardLast4
    ) {
        this.listingId = listingId;
        this.listingName = listingName;
        this.buyerId = buyerId;
        this.sellerId = sellerId;
        this.itemPrice = itemPrice;
        this.shippingCost = shippingCost;
        this.commission = commission;
        this.buyerTotal = buyerTotal;
        this.sellerNet = sellerNet;
        this.cardLast4 = cardLast4;
        // PostgreSQL garde les microsecondes : sans cet arrondi, la valeur relue différerait de la valeur écrite.
        this.createdAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
    }

    public UUID getId() {
        return id;
    }

    public UUID getListingId() {
        return listingId;
    }

    public String getListingName() {
        return listingName;
    }

    public UUID getBuyerId() {
        return buyerId;
    }

    public UUID getSellerId() {
        return sellerId;
    }

    public BigDecimal getItemPrice() {
        return itemPrice;
    }

    public BigDecimal getShippingCost() {
        return shippingCost;
    }

    public BigDecimal getCommission() {
        return commission;
    }

    public BigDecimal getBuyerTotal() {
        return buyerTotal;
    }

    public BigDecimal getSellerNet() {
        return sellerNet;
    }

    public String getCardLast4() {
        return cardLast4;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
