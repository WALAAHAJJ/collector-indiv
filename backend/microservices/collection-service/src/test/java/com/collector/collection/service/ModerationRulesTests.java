package com.collector.collection.service;

import com.collector.collection.domain.ListingStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTimeout;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ModerationRulesTests {

    private final ModerationService service = new ModerationService();

    @Test
    void rejectsPhoneNumberWithoutSeparators() {
        assertEquals(ListingStatus.REJECTED, status("0612345678"));
    }

    @Test
    void rejectsInternationalPhoneNumber() {
        assertEquals(ListingStatus.REJECTED, status("Joignable au +33 6 12 34 56 78"));
    }

    @Test
    void rejectsPhoneNumberWithDots() {
        assertEquals(ListingStatus.REJECTED, status("06.12.34.56.78"));
    }

    @Test
    void doesNotMistakeYearRangesForPhoneNumbers() {
        assertEquals(ListingStatus.APPROVED, status("Série émise entre 1998-2004"));
        assertEquals(ListingStatus.APPROVED, status("Années 1950 à 1960, 24 pièces"));
    }

    @Test
    void rejectsEmailWithSubdomain() {
        assertEquals(ListingStatus.REJECTED, status("Écrire à x@mail.fr.example.com svp"));
    }

    @Test
    void doesNotMistakeAtSignForEmail() {
        assertEquals(ListingStatus.APPROVED, status("Prix @ 20 euros"));
    }

    @Test
    void rejectsForbiddenWordWrittenWithCombiningCharacter() {
        assertEquals(ListingStatus.REJECTED, status("Copie, contrefac\u0327on de luxe"));
    }

    @Test
    void phoneDetectionNeedsAtLeastNineDigits() {
        assertTrue(ModerationService.containsPhoneNumber("123456789"));
        assertFalse(ModerationService.containsPhoneNumber("12345678"));
        assertFalse(ModerationService.containsPhoneNumber("1234 abc 5678"));
    }

    @Test
    void staysFastOnHostileInput() {
        String hostile = "a@" + "b.".repeat(50_000);

        assertTimeout(Duration.ofSeconds(2),
                () -> service.evaluate("x", hostile, new BigDecimal("1")));
    }

    private ListingStatus status(String description) {
        return service.evaluate("Objet", description, new BigDecimal("20")).status();
    }
}
