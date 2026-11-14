package com.collector.notification.events;

import com.collector.notification.domain.Notification;
import com.collector.notification.domain.NotificationType;
import com.collector.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class ListingEventListenerTests {

    @Autowired
    private ListingEventListener listener;

    @Autowired
    private NotificationRepository repository;

    private final UUID owner = UUID.randomUUID();
    private final UUID listing = UUID.randomUUID();

    @BeforeEach
    void cleanDatabase() {
        repository.deleteAll();
    }

    private Message event(String name, String status, String reason) {
        MessageProperties properties = new MessageProperties();
        properties.setHeader("listingId", listing.toString());
        properties.setHeader("ownerId", owner.toString());
        if (status != null) {
            properties.setHeader("status", status);
        }
        if (reason != null) {
            properties.setHeader("reason", reason);
        }
        return new Message(name.getBytes(StandardCharsets.UTF_8), properties);
    }

    private Notification onlyNotification() {
        List<Notification> all = repository.findAll();
        assertEquals(1, all.size());
        return all.get(0);
    }

    @Test
    void approvedListingNotifiesItsOwner() {
        listener.onListingEvent(event("Lot de timbres", "APPROVED", null));

        Notification notification = onlyNotification();
        assertEquals(owner, notification.getUserId());
        assertEquals(listing, notification.getListingId());
        assertEquals(NotificationType.LISTING_APPROVED, notification.getType());
        assertTrue(notification.getMessage().contains("« Lot de timbres »"));
        assertTrue(notification.getMessage().contains("approuvée"));
        assertFalse(notification.isRead());
    }

    @Test
    void rejectedListingIncludesTheReason() {
        listener.onListingEvent(event("Vinyle", "REJECTED", "Les coordonnées personnelles sont interdites"));

        Notification notification = onlyNotification();
        assertEquals(NotificationType.LISTING_REJECTED, notification.getType());
        assertTrue(notification.getMessage().contains("refusée"));
        assertTrue(notification.getMessage().contains("Les coordonnées personnelles sont interdites"));
    }

    @Test
    void rejectedListingWithoutReasonStillNotifies() {
        listener.onListingEvent(event("Vinyle", "REJECTED", null));

        assertEquals("Votre annonce « Vinyle » a été refusée.", onlyNotification().getMessage());
    }

    @Test
    void listingPendingReviewTellsTheOwnerToWait() {
        listener.onListingEvent(event("Pièce rare", "PENDING_REVIEW", null));

        Notification notification = onlyNotification();
        assertEquals(NotificationType.LISTING_PENDING_REVIEW, notification.getType());
        assertTrue(notification.getMessage().contains("en attente de validation"));
    }

    @Test
    void unknownStatusIsIgnored() {
        assertDoesNotThrow(() -> listener.onListingEvent(event("Vinyle", "VENDUE", null)));

        assertEquals(0, repository.count());
    }

    @Test
    void messageWithoutStatusIsIgnored() {
        assertDoesNotThrow(() -> listener.onListingEvent(event("Vinyle", null, null)));

        assertEquals(0, repository.count());
    }

    @Test
    void messageWithAnInvalidOwnerIsIgnored() {
        MessageProperties properties = new MessageProperties();
        properties.setHeader("listingId", listing.toString());
        properties.setHeader("ownerId", "pas-un-identifiant");
        properties.setHeader("status", "APPROVED");
        Message message = new Message("Vinyle".getBytes(StandardCharsets.UTF_8), properties);

        assertDoesNotThrow(() -> listener.onListingEvent(message));

        assertEquals(0, repository.count());
    }

    @Test
    void veryLongTextIsCutToTheColumnSize() {
        String text = ListingEventListener.text(
                NotificationType.LISTING_REJECTED, "x".repeat(120), "y".repeat(600));

        assertEquals(500, text.length());
    }
}
