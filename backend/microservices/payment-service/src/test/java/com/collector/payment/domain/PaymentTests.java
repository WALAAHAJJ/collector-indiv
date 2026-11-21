package com.collector.payment.domain;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PaymentTests {

    private static final Instant NOW = Instant.parse("2026-06-15T10:00:00Z");
    private static final Instant LATER = Instant.parse("2026-06-15T10:05:00Z");

    private final UUID user = UUID.randomUUID();

    private Payment accepted() {
        return Payment.succeeded(user, new BigDecimal("23.00"), "4242", NOW);
    }

    @Test
    void anAcceptedPaymentKeepsItsAmountAndTheEndOfTheCard() {
        Payment payment = accepted();

        assertEquals(PaymentStatus.SUCCEEDED, payment.getStatus());
        assertEquals(user, payment.getUserId());
        assertEquals(new BigDecimal("23.00"), payment.getAmount());
        assertEquals("4242", payment.getLast4());
        assertEquals(NOW, payment.getCreatedAt());
        assertNull(payment.getDeclineReason());
        assertNull(payment.getRefundedAt());
    }

    @Test
    void aDeclinedPaymentKeepsTheReason() {
        Payment payment = Payment.declined(user, new BigDecimal("23.00"), "0002", "Paiement refusé par la banque.", NOW);

        assertEquals(PaymentStatus.DECLINED, payment.getStatus());
        assertEquals("Paiement refusé par la banque.", payment.getDeclineReason());
    }

    @Test
    void anAcceptedPaymentCanBeRefundedOnce() {
        Payment payment = accepted();

        payment.refund(LATER);

        assertEquals(PaymentStatus.REFUNDED, payment.getStatus());
        assertEquals(LATER, payment.getRefundedAt());
        assertThrows(IllegalStateException.class, () -> payment.refund(LATER));
    }

    @Test
    void aDeclinedPaymentCannotBeRefunded() {
        Payment payment = Payment.declined(user, new BigDecimal("5.00"), "0002", "refus", NOW);

        assertThrows(IllegalStateException.class, () -> payment.refund(LATER));
        assertEquals(PaymentStatus.DECLINED, payment.getStatus());
    }
}
