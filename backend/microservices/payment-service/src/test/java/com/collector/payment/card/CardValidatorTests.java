package com.collector.payment.card;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CardValidatorTests {

    /** « Aujourd'hui » vaut le 15 juin 2026. */
    private final CardValidator validator = new CardValidator(
            Clock.fixed(Instant.parse("2026-06-15T10:00:00Z"), ZoneOffset.UTC));

    @Test
    void acceptsTheTestCardThatAlwaysSucceeds() {
        assertDoesNotThrow(() -> validator.validate(card("4242 4242 4242 4242", "12/30")));
    }

    @Test
    void acceptsDashesAndSpacesInTheNumber() {
        assertDoesNotThrow(() -> validator.validate(card("4242-4242-4242-4242", "12/30")));
    }

    @Test
    void refusesTheTestCardThatAlwaysFails() {
        CardDeclinedException exception = assertThrows(CardDeclinedException.class,
                () -> validator.validate(card(CardValidator.DECLINED_TEST_CARD, "12/30")));

        assertEquals("Paiement refusé par la banque.", exception.getMessage());
    }

    @Test
    void refusesANumberWithABadChecksum() {
        CardDeclinedException exception = assertThrows(CardDeclinedException.class,
                () -> validator.validate(card("4242 4242 4242 4241", "12/30")));

        assertEquals("Numéro de carte invalide.", exception.getMessage());
    }

    @Test
    void refusesATooShortNumber() {
        assertThrows(CardDeclinedException.class, () -> validator.validate(card("4242", "12/30")));
    }

    @Test
    void refusesAnExpiredCard() {
        CardDeclinedException exception = assertThrows(CardDeclinedException.class,
                () -> validator.validate(card("4242424242424242", "05/26")));

        assertEquals("Carte expirée.", exception.getMessage());
    }

    @Test
    void acceptsACardExpiringThisMonth() {
        // valable jusqu'à la fin du mois indiqué
        assertDoesNotThrow(() -> validator.validate(card("4242424242424242", "06/26")));
    }

    @Test
    void luhnAcceptsKnownValidNumbersAndRejectsOthers() {
        assertTrue(CardValidator.passesLuhn("4242424242424242"));
        assertTrue(CardValidator.passesLuhn("79927398713"));
        assertFalse(CardValidator.passesLuhn("79927398710"));
    }

    @Test
    void cardDetailsNeverPrintTheFullNumber() {
        CardDetails card = card("4242 4242 4242 4242", "12/30");

        assertEquals("CardDetails[****4242]", card.toString());
        assertFalse(card.toString().contains("4242 4242"));
    }

    @Test
    void last4OfAShortNumberIsTheNumberItself() {
        assertEquals("42", card("42", "12/30").last4());
    }

    private static CardDetails card(String number, String expiry) {
        return new CardDetails(number, "Walaa Test", expiry, "123");
    }
}
