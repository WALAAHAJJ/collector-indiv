package com.collector.collection.domain;

import com.collector.collection.payment.CommissionCalculator.Breakdown;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

    /** Identifiant du paiement dans payment-service (vide pour les commandes anciennes). */
    @Column(length = 40)
    private String paymentId;

    @Column(nullable = false)
    private Instant createdAt;

    // « default 'PAID' » : les commandes déjà enregistrées avant l'ajout de cette colonne reçoivent PAID.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(20) default 'PAID'")
    private OrderStatus status = OrderStatus.PAID;

    private Instant shippedAt;

    private Instant deliveredAt;

    private Instant refundedAt;

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

    /** Même commande, avec la référence du paiement qui l'a réglée. */
    public PurchaseOrder(Collectible listing, UUID buyerId, Breakdown breakdown, String cardLast4, String paymentId) {
        this(listing, buyerId, breakdown, cardLast4);
        this.paymentId = paymentId;
    }

    public String getPaymentId() {
        return paymentId;
    }

    /** Le vendeur a expédié : seulement possible pour une commande payée. */
    public void markShipped() {
        if (status != OrderStatus.PAID) {
            throw new IllegalStateException("Une commande " + status + " ne peut pas être expédiée.");
        }

        status = OrderStatus.SHIPPED;
        shippedAt = now();
    }

    /** L'acheteur a reçu : seulement possible pour une commande expédiée. */
    public void markDelivered() {
        if (status != OrderStatus.SHIPPED) {
            throw new IllegalStateException("Une commande " + status + " ne peut pas être marquée reçue.");
        }

        status = OrderStatus.DELIVERED;
        deliveredAt = now();
    }

    /** Remboursée par l'administration : possible tant que la commande n'est pas déjà remboursée. */
    public void markRefunded() {
        if (status == OrderStatus.REFUNDED) {
            throw new IllegalStateException("Cette commande est déjà remboursée.");
        }

        status = OrderStatus.REFUNDED;
        refundedAt = now();
    }

    // Microsecondes, comme createdAt : PostgreSQL ne garde pas les nanosecondes.
    private static Instant now() {
        return Instant.now().truncatedTo(ChronoUnit.MICROS);
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

    public OrderStatus getStatus() {
        return status;
    }

    public Instant getShippedAt() {
        return shippedAt;
    }

    public Instant getDeliveredAt() {
        return deliveredAt;
    }

    public Instant getRefundedAt() {
        return refundedAt;
    }
}
