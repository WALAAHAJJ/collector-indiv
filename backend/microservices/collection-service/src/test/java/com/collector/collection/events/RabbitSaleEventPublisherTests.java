package com.collector.collection.events;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RabbitSaleEventPublisherTests {

    private final UUID orderId = UUID.randomUUID();
    private final UUID listingId = UUID.randomUUID();
    private final UUID sellerId = UUID.randomUUID();
    private final UUID buyerId = UUID.randomUUID();

    private SaleEvent event() {
        return new SaleEvent(orderId, listingId, sellerId, buyerId, "Lot de timbres", new BigDecimal("22.00"), Instant.now());
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
    void publishesOnTheEventsExchangeWithTheOrderPaidKey() {
        RecordingTemplate template = new RecordingTemplate();

        new RabbitSaleEventPublisher(template, true).publish(event());

        assertEquals(List.of("collector.events"), template.exchanges);
        assertEquals(List.of("order.paid"), template.routingKeys);
    }

    @Test
    void carriesTheFactsInTheHeadersAndTheNameInTheBody() {
        RecordingTemplate template = new RecordingTemplate();

        new RabbitSaleEventPublisher(template, true).publish(event());

        Message message = template.messages.get(0);
        assertEquals("Lot de timbres", new String(message.getBody(), StandardCharsets.UTF_8));
        assertEquals(orderId.toString(), message.getMessageProperties().getHeader("orderId"));
        assertEquals(listingId.toString(), message.getMessageProperties().getHeader("listingId"));
        assertEquals(sellerId.toString(), message.getMessageProperties().getHeader("sellerId"));
        assertEquals(buyerId.toString(), message.getMessageProperties().getHeader("buyerId"));
        assertEquals("22.00", message.getMessageProperties().getHeader("sellerNet"));
        assertNotNull(message.getMessageProperties().getMessageId());
    }

    @Test
    void keepsAccentsInTheBody() {
        RecordingTemplate template = new RecordingTemplate();

        new RabbitSaleEventPublisher(template, true).publish(new SaleEvent(
                orderId, listingId, sellerId, buyerId, "Pièce « rare » – œuvre", BigDecimal.TEN, Instant.now()));

        assertEquals("Pièce « rare » – œuvre",
                new String(template.messages.get(0).getBody(), StandardCharsets.UTF_8));
    }

    @Test
    void doesNothingWhenEventsAreDisabled() {
        RecordingTemplate template = new RecordingTemplate();

        new RabbitSaleEventPublisher(template, false).publish(event());

        assertTrue(template.messages.isEmpty());
    }

    @Test
    void aStoppedBrokerNeverBreaksTheSale() {
        RecordingTemplate template = new RecordingTemplate();
        template.failing = true;

        assertDoesNotThrow(() -> new RabbitSaleEventPublisher(template, true).publish(event()));
    }
}
