package com.collector.payment.domain;

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
import java.util.UUID;

/**
 * Trace d'une tentative de paiement. On ne garde jamais le numéro de carte : seulement les quatre
 * derniers chiffres, pour que l'acheteur reconnaisse sa carte.
 */
@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Le payeur, tel que l'indique le jeton de connexion. */
    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 4)
    private String last4;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status;

    /** Motif du refus, vide pour un paiement accepté. */
    @Column(length = 255)
    private String declineReason;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant refundedAt;

    protected Payment() {
    }

    private Payment(UUID userId, BigDecimal amount, String last4, PaymentStatus status,
                    String declineReason, Instant createdAt) {
        this.userId = userId;
        this.amount = amount;
        this.last4 = last4;
        this.status = status;
        this.declineReason = declineReason;
        this.createdAt = createdAt;
    }

    public static Payment succeeded(UUID userId, BigDecimal amount, String last4, Instant now) {
        return new Payment(userId, amount, last4, PaymentStatus.SUCCEEDED, null, now);
    }

    public static Payment declined(UUID userId, BigDecimal amount, String last4, String reason, Instant now) {
        return new Payment(userId, amount, last4, PaymentStatus.DECLINED, reason, now);
    }

    /**
     * Rembourse le paiement. Seul un paiement accepté se rembourse, et une seule fois.
     *
     * @throws IllegalStateException si le paiement n'est pas dans l'état « accepté »
     */
    public void refund(Instant now) {
        if (status != PaymentStatus.SUCCEEDED) {
            throw new IllegalStateException("Seul un paiement accepté peut être remboursé (état : " + status + ").");
        }

        status = PaymentStatus.REFUNDED;
        refundedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getLast4() {
        return last4;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public String getDeclineReason() {
        return declineReason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getRefundedAt() {
        return refundedAt;
    }
}
