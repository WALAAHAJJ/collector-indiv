package com.collector.collection.events;

import com.collector.collection.domain.ListingStatus;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RabbitListingEventPublisherTests {

    private final UUID listingId = UUID.randomUUID();
    private final UUID ownerId = UUID.randomUUID();

    private ListingStatusEvent event(ListingStatus status, String reason) {
        return new ListingStatusEvent(listingId, ownerId, "Lot de timbres", status, reason, Instant.now());
    }

    /** Un RabbitTemplate qui note ce qu'on lui demande d'envoyer, sans réseau. */
    private static final class RecordingTemplate extends RabbitTemplate {

        final List<String> exchanges = new ArrayList<>();
        final List<String> routingKeys = new ArrayList<>();
        final List<Message> messages = new ArrayList<>();
        boolean failing;

        @Override
        public void send(String exchange, String routingKey, Message message) {
            if (failing) {
                throw new AmqpException("RabbitMQ est arrêté");
            }

            exchanges.add(exchange);
            routingKeys.add(routingKey);
            messages.add(message);
        }
    }

    @Test
    void publishesOnTheEventsExchangeWithAStatusRoutingKey() {
        RecordingTemplate template = new RecordingTemplate();
        RabbitListingEventPublisher publisher = new RabbitListingEventPublisher(template, true);

        publisher.publish(event(ListingStatus.APPROVED, null));
        publisher.publish(event(ListingStatus.REJECTED, "Terme interdit"));
        publisher.publish(event(ListingStatus.PENDING_REVIEW, "Prix élevé"));

        assertEquals(List.of("collector.events", "collector.events", "collector.events"), template.exchanges);
        assertEquals(
                List.of("listing.approved", "listing.rejected", "listing.pending_review"),
                template.routingKeys);
    }

    @Test
    void carriesTheFactsInTheHeadersAndTheNameInTheBody() {
        RecordingTemplate template = new RecordingTemplate();
        RabbitListingEventPublisher publisher = new RabbitListingEventPublisher(template, true);

        publisher.publish(event(ListingStatus.REJECTED, "Les coordonnées personnelles sont interdites."));

        Message message = template.messages.get(0);
        assertEquals("Lot de timbres", new String(message.getBody(), StandardCharsets.UTF_8));
        assertEquals(listingId.toString(), message.getMessageProperties().getHeader("listingId"));
        assertEquals(ownerId.toString(), message.getMessageProperties().getHeader("ownerId"));
        assertEquals("REJECTED", message.getMessageProperties().getHeader("status"));
        assertEquals(
                "Les coordonnées personnelles sont interdites.",
                message.getMessageProperties().getHeader("reason"));
        assertNotNull(message.getMessageProperties().getMessageId());
    }

    @Test
    void omitsTheReasonWhenThereIsNone() {
        RecordingTemplate template = new RecordingTemplate();
        RabbitListingEventPublisher publisher = new RabbitListingEventPublisher(template, true);

        publisher.publish(event(ListingStatus.APPROVED, null));

        assertNull(template.messages.get(0).getMessageProperties().getHeader("reason"));
    }

    @Test
    void keepsAccentsInTheBody() {
        RecordingTemplate template = new RecordingTemplate();
        RabbitListingEventPublisher publisher = new RabbitListingEventPublisher(template, true);

        publisher.publish(new ListingStatusEvent(
                listingId, ownerId, "Pièce « rare » – œuvre", ListingStatus.APPROVED, null, Instant.now()));

        assertEquals(
                "Pièce « rare » – œuvre",
                new String(template.messages.get(0).getBody(), StandardCharsets.UTF_8));
    }

    @Test
    void doesNothingWhenEventsAreDisabled() {
        RecordingTemplate template = new RecordingTemplate();
        RabbitListingEventPublisher publisher = new RabbitListingEventPublisher(template, false);

        publisher.publish(event(ListingStatus.APPROVED, null));

        assertTrue(template.messages.isEmpty());
    }

    @Test
    void neverFailsTheCallerWhenRabbitMqIsDown() {
        RecordingTemplate template = new RecordingTemplate();
        template.failing = true;
        RabbitListingEventPublisher publisher = new RabbitListingEventPublisher(template, true);

        assertDoesNotThrow(() -> publisher.publish(event(ListingStatus.APPROVED, null)));
    }
}
