package com.collector.collection.service;

import com.collector.collection.domain.ListingStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class ModerationServiceTests {

    private final ModerationService service = new ModerationService();

    @Test
    void approvesCleanListing() {
        ModerationResult result = service.evaluate(
                "Vinyle jazz", "Très bon état, pochette d’origine", new BigDecimal("25.00"));

        assertEquals(ListingStatus.APPROVED, result.status());
        assertNull(result.reason());
    }

    @Test
    void rejectsEmailInDescription() {
        ModerationResult result = service.evaluate(
                "Vinyle", "Contactez-moi sur jean.dupont@mail.com", new BigDecimal("25.00"));

        assertEquals(ListingStatus.REJECTED, result.status());
        assertNotNull(result.reason());
    }

    @Test
    void rejectsPhoneNumberInDescription() {
        ModerationResult result = service.evaluate(
                "Vinyle", "Appelez le 06 12 34 56 78", new BigDecimal("25.00"));

        assertEquals(ListingStatus.REJECTED, result.status());
    }

    @Test
    void rejectsOffPlatformPaymentWord() {
        ModerationResult result = service.evaluate(
                "Figurine", "Paiement par PayPal uniquement", new BigDecimal("40.00"));

        assertEquals(ListingStatus.REJECTED, result.status());
    }

    @Test
    void doesNotRejectWordsThatOnlyContainAForbiddenWord() {
        ModerationResult result = service.evaluate(
                "Réveil alarme vintage", "Fonctionne parfaitement", new BigDecimal("30.00"));

        assertEquals(ListingStatus.APPROVED, result.status());
    }

    @Test
    void sendsVeryHighPriceToManualReview() {
        ModerationResult result = service.evaluate(
                "Figurine rare", "Édition limitée numérotée", new BigDecimal("6000.00"));

        assertEquals(ListingStatus.PENDING_REVIEW, result.status());
    }
}
