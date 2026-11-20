package com.collector.collection.domain;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ReviewTests {

    private Review review(int rating, String comment) {
        return new Review(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), rating, comment);
    }

    @Test
    void keepsTheRatingAndTheCommentWithoutSurroundingSpaces() {
        Review review = review(4, "  Envoi rapide  ");

        assertEquals(4, review.getRating());
        assertEquals("Envoi rapide", review.getComment());
        assertNotNull(review.getCreatedAt());
    }

    @Test
    void aBlankOrMissingCommentIsStoredAsNull() {
        assertNull(review(5, "   ").getComment());
        assertNull(review(5, null).getComment());
    }

    @Test
    void acceptsTheBoundaryRatings() {
        assertEquals(1, review(1, null).getRating());
        assertEquals(5, review(5, null).getRating());
    }

    @Test
    void refusesARatingOutsideOneToFive() {
        assertThrows(IllegalArgumentException.class, () -> review(0, null));
        assertThrows(IllegalArgumentException.class, () -> review(6, null));
    }

    @Test
    void refusesATooLongComment() {
        assertThrows(IllegalArgumentException.class, () -> review(3, "a".repeat(501)));
        assertEquals(500, review(3, "a".repeat(500)).getComment().length());
    }
}
