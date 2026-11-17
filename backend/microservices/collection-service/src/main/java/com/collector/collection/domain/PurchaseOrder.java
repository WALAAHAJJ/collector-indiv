package com.collector.collection.domain;

import com.collector.collection.payment.CommissionCalculator.Breakdown;
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

    /**
     * Fige l'annonce et les montants au moment de la vente. Les montants viennent du calcul
     * de commission : {@code breakdown} regroupe prix, port, commission, total et gain du vendeur.
     */
    public PurchaseOrder(Collectible listing, UUID buyerId, Breakdown breakdown, String cardLast4) {
        this.listingId = listing.getId();
        this.listingName = listing.getName();
        this.buyerId = buyerId;
        this.sellerId = listing.getOwnerId();
        this.itemPrice = breakdown.itemPrice();
        this.shippingCost = breakdown.shippingCost();
        this.commission = breakdown.commission();
        this.buyerTotal = breakdown.buyerTotal();
        this.sellerNet = breakdown.sellerNet();
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
