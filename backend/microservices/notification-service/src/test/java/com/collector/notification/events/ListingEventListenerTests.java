package com.collector.notification.events;

import com.collector.notification.domain.Notification;
import com.collector.notification.domain.NotificationType;
import com.collector.notification.repository.NotificationRepository;
import com.collector.notification.service.NotificationService;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class ListingEventListenerTests {

    @Autowired
    private NotificationService service;

    @Autowired
    private NotificationRepository repository;

    private ListingEventListener listener;

    private final UUID owner = UUID.randomUUID();
    private final UUID listing = UUID.randomUUID();

    @BeforeEach
    void cleanDatabase() {
        repository.deleteAll();
        listener = new ListingEventListener(service);
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

    private Message sale(String name, String sellerNet) {
        MessageProperties properties = new MessageProperties();
        properties.setReceivedRoutingKey("order.paid");
        properties.setHeader("orderId", UUID.randomUUID().toString());
        properties.setHeader("listingId", listing.toString());
        properties.setHeader("sellerId", owner.toString());
        if (sellerNet != null) {
            properties.setHeader("sellerNet", sellerNet);
        }
        return new Message(name.getBytes(StandardCharsets.UTF_8), properties);
    }

    @Test
    void aSaleNotifiesTheSellerWithTheNetGain() {
        listener.onListingEvent(sale("Lot de timbres", "22.00"));

        Notification notification = onlyNotification();
        assertEquals(owner, notification.getUserId());
        assertEquals(listing, notification.getListingId());
        assertEquals(NotificationType.ORDER_SOLD, notification.getType());
        assertTrue(notification.getMessage().contains("« Lot de timbres » est vendu"));
        assertTrue(notification.getMessage().contains("Vous gagnez 22,00 €"));
        assertTrue(notification.getMessage().contains("expédiez la commande depuis Mes commandes > Mes ventes"));
    }

    @Test
    void aSaleAlsoNotifiesTheBuyerThatThePaymentIsConfirmed() {
        UUID buyerId = UUID.randomUUID();
        Message message = sale("Lot de timbres", "22.00");
        message.getMessageProperties().setHeader("buyerId", buyerId.toString());

        listener.onListingEvent(message);

        Notification paid = repository.findAll().stream()
                .filter(n -> n.getType() == NotificationType.ORDER_PAID).findFirst().orElseThrow();
        assertEquals(buyerId, paid.getUserId());
        assertEquals(listing, paid.getListingId());
        assertTrue(paid.getMessage().contains("paiement pour « Lot de timbres » est confirmé"));
        assertEquals(2, repository.count());
    }

    @Test
    void aSaleWithoutBuyerOnlyNotifiesTheSeller() {
        listener.onListingEvent(sale("Lot de timbres", "22.00"));

        assertEquals(NotificationType.ORDER_SOLD, onlyNotification().getType());
    }

    @Test
    void theGainIsAlwaysShownWithTwoDecimals() {
        listener.onListingEvent(sale("Montre", "7.5"));

        assertTrue(onlyNotification().getMessage().contains("Vous gagnez 7,50 €"));
    }

    @Test
    void aSaleWithoutAmountIsIgnored() {
        assertDoesNotThrow(() -> listener.onListingEvent(sale("Montre", null)));

        assertTrue(repository.findAll().isEmpty());
    }

    @Test
    void aSaleWithAnInvalidAmountIsIgnored() {
        assertDoesNotThrow(() -> listener.onListingEvent(sale("Montre", "beaucoup")));

        assertTrue(repository.findAll().isEmpty());
    }

    @Test
    void aSaleWithoutSellerIsIgnored() {
        Message message = sale("Montre", "22.00");
        message.getMessageProperties().getHeaders().remove("sellerId");

        assertDoesNotThrow(() -> listener.onListingEvent(message));

        assertTrue(repository.findAll().isEmpty());
    }

    @Test
    void aListingDecisionIsStillHandledWhenARoutingKeyIsPresent() {
        Message message = event("Lot de timbres", "APPROVED", null);
        message.getMessageProperties().setReceivedRoutingKey("listing.approved");

        listener.onListingEvent(message);

        assertEquals(NotificationType.LISTING_APPROVED, onlyNotification().getType());
    }

    private final UUID buyer = UUID.randomUUID();

    private Message step(String routingKey, String name) {
        MessageProperties properties = new MessageProperties();
        properties.setReceivedRoutingKey(routingKey);
        properties.setHeader("orderId", UUID.randomUUID().toString());
        properties.setHeader("listingId", listing.toString());
        properties.setHeader("buyerId", buyer.toString());
        properties.setHeader("sellerId", owner.toString());
        return new Message(name.getBytes(StandardCharsets.UTF_8), properties);
    }

    @Test
    void shippingNotifiesTheBuyer() {
        listener.onListingEvent(step("order.shipped", "Montre"));

        Notification notification = onlyNotification();
        assertEquals(buyer, notification.getUserId());
        assertEquals(listing, notification.getListingId());
        assertEquals(NotificationType.ORDER_SHIPPED, notification.getType());
        assertTrue(notification.getMessage().contains("« Montre » a été expédiée"));
        assertTrue(notification.getMessage().contains("confirmez-le dans Mes commandes > Mes achats"));
    }

    @Test
    void deliveryNotifiesTheSeller() {
        listener.onListingEvent(step("order.delivered", "Montre"));

        Notification notification = onlyNotification();
        assertEquals(owner, notification.getUserId());
        assertEquals(NotificationType.ORDER_DELIVERED, notification.getType());
        assertTrue(notification.getMessage().contains("confirmé la réception de « Montre »"));
        assertTrue(notification.getMessage().contains("laisser un avis"));
    }

    @Test
    void refundNotifiesTheBuyer() {
        listener.onListingEvent(step("order.refunded", "Montre"));

        Notification notification = onlyNotification();
        assertEquals(buyer, notification.getUserId());
        assertEquals(listing, notification.getListingId());
        assertEquals(NotificationType.ORDER_REFUNDED, notification.getType());
        assertTrue(notification.getMessage().contains("« Montre » a été remboursée"));
    }

    @Test
    void anOrderStepWithoutRecipientIsIgnored() {
        Message message = step("order.shipped", "Montre");
        message.getMessageProperties().getHeaders().remove("buyerId");

        assertDoesNotThrow(() -> listener.onListingEvent(message));

        assertTrue(repository.findAll().isEmpty());
    }

    @Test
    void orderStepTextsAreCutToTheColumnSize() {
        assertEquals(500, ListingEventListener.orderStepText(NotificationType.ORDER_SHIPPED, "x".repeat(600)).length());
    }

    @Test
    void orderStepTextRefusesOtherTypes() {
        assertThrows(IllegalArgumentException.class,
                () -> ListingEventListener.orderStepText(NotificationType.ORDER_PAID, "Montre"));
    }

    @Test
    void listingTextRefusesOrderTypes() {
        assertThrows(IllegalArgumentException.class,
                () -> ListingEventListener.text(NotificationType.ORDER_SHIPPED, "Montre", null));
    }
}
