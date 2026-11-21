package com.collector.payment.api.dto;

import com.collector.payment.domain.Payment;
import com.collector.payment.domain.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Ce que l'on sait d'un paiement : jamais le numéro de carte, seulement sa fin. */
public record PaymentResponse(
        UUID id,
        BigDecimal amount,
        String last4,
        PaymentStatus status,
        Instant createdAt,
        Instant refundedAt
) {

    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getAmount(),
                payment.getLast4(),
                payment.getStatus(),
                payment.getCreatedAt(),
                payment.getRefundedAt()
        );
    }
}
