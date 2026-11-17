package com.collector.collection.payment;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SimulatedPaymentGatewayTests {

    /** « Aujourd'hui » vaut le 15 juin 2026. */
    private final SimulatedPaymentGateway gateway = new SimulatedPaymentGateway(
            Clock.fixed(Instant.parse("2026-06-15T10:00:00Z"), ZoneOffset.UTC));

    private static final BigDecimal AMOUNT = new BigDecimal("23.00");

    @Test
    void acceptsTheTestCardThatAlwaysSucceeds() {
        assertDoesNotThrow(() -> gateway.charge(card("4242 4242 4242 4242", "12/30"), AMOUNT));
    }

    @Test
    void acceptsDashesAndSpacesInTheNumber() {
        assertDoesNotThrow(() -> gateway.charge(card("4242-4242-4242-4242", "12/30"), AMOUNT));
    }

    @Test
    void refusesTheTestCardThatAlwaysFails() {
        PaymentDeclinedException exception = assertThrows(PaymentDeclinedException.class,
                () -> gateway.charge(card(SimulatedPaymentGateway.DECLINED_TEST_CARD, "12/30"), AMOUNT));

        assertEquals("Paiement refusé par la banque.", exception.getMessage());
    }

    @Test
    void refusesANumberWithABadChecksum() {
        PaymentDeclinedException exception = assertThrows(PaymentDeclinedException.class,
                () -> gateway.charge(card("4242 4242 4242 4241", "12/30"), AMOUNT));

        assertEquals("Numéro de carte invalide.", exception.getMessage());
    }

    @Test
    void refusesATooShortNumber() {
        assertThrows(PaymentDeclinedException.class,
                () -> gateway.charge(card("4242", "12/30"), AMOUNT));
    }

    @Test
    void refusesAnExpiredCard() {
        PaymentDeclinedException exception = assertThrows(PaymentDeclinedException.class,
                () -> gateway.charge(card("4242424242424242", "05/26"), AMOUNT));

        assertEquals("Carte expirée.", exception.getMessage());
    }

    @Test
    void acceptsACardExpiringThisMonth() {
        // valable jusqu'à la fin du mois indiqué
        assertDoesNotThrow(() -> gateway.charge(card("4242424242424242", "06/26"), AMOUNT));
    }

    @Test
    void luhnAcceptsKnownValidNumbersAndRejectsOthers() {
        assertTrue(SimulatedPaymentGateway.passesLuhn("4242424242424242"));
        assertTrue(SimulatedPaymentGateway.passesLuhn("79927398713"));
        assertFalse(SimulatedPaymentGateway.passesLuhn("79927398710"));
    }

    @Test
    void cardDetailsNeverPrintTheFullNumber() {
        CardDetails card = card("4242 4242 4242 4242", "12/30");

        assertEquals("CardDetails[****4242]", card.toString());
        assertFalse(card.toString().contains("4242 4242"));
    }

    private static CardDetails card(String number, String expiry) {
        return new CardDetails(number, "Walaa Test", expiry, "123");
    }
}
