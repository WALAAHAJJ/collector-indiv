package com.collector.collection.events;

import com.collector.collection.domain.OrderStatus;
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

class RabbitOrderStatusEventPublisherTests {

    private final UUID orderId = UUID.randomUUID();
    private final UUID listingId = UUID.randomUUID();
    private final UUID buyerId = UUID.randomUUID();
    private final UUID sellerId = UUID.randomUUID();

    private OrderStatusEvent event(OrderStatus status) {
        return new OrderStatusEvent(orderId, listingId, buyerId, sellerId, "Pièce « rare »", status, Instant.now());
    }

    private static final class RecordingTemplate extends RabbitTemplate {

        final List<String> routingKeys = new ArrayList<>();
        final List<Message> messages = new ArrayList<>();
        boolean failing;

        @Override
        public void send(String exchange, String routingKey, Message message) {
            if (failing) {
                throw new AmqpException("RabbitMQ est arrêté");
            }

            routingKeys.add(routingKey);
            messages.add(message);
        }
    }

    @Test
    void shippingUsesTheShippedKey() {
        RecordingTemplate template = new RecordingTemplate();

        new RabbitOrderStatusEventPublisher(template, true).publish(event(OrderStatus.SHIPPED));

        assertEquals(List.of("order.shipped"), template.routingKeys);
    }

    @Test
    void deliveryUsesTheDeliveredKey() {
        RecordingTemplate template = new RecordingTemplate();

        new RabbitOrderStatusEventPublisher(template, true).publish(event(OrderStatus.DELIVERED));

        assertEquals(List.of("order.delivered"), template.routingKeys);
    }

    @Test
    void thePaidStatusIsNotPublishedHere() {
        RecordingTemplate template = new RecordingTemplate();

        new RabbitOrderStatusEventPublisher(template, true).publish(event(OrderStatus.PAID));

        assertTrue(template.messages.isEmpty());
        assertNull(RabbitOrderStatusEventPublisher.routingKeyOf(OrderStatus.PAID));
    }

    @Test
    void carriesTheBuyerAndTheSellerInTheHeaders() {
        RecordingTemplate template = new RecordingTemplate();

        new RabbitOrderStatusEventPublisher(template, true).publish(event(OrderStatus.SHIPPED));

        Message message = template.messages.get(0);
        assertEquals("Pièce « rare »", new String(message.getBody(), StandardCharsets.UTF_8));
        assertEquals(orderId.toString(), message.getMessageProperties().getHeader("orderId"));
        assertEquals(listingId.toString(), message.getMessageProperties().getHeader("listingId"));
        assertEquals(buyerId.toString(), message.getMessageProperties().getHeader("buyerId"));
        assertEquals(sellerId.toString(), message.getMessageProperties().getHeader("sellerId"));
        assertNotNull(message.getMessageProperties().getMessageId());
    }

    @Test
    void doesNothingWhenEventsAreDisabled() {
        RecordingTemplate template = new RecordingTemplate();

        new RabbitOrderStatusEventPublisher(template, false).publish(event(OrderStatus.SHIPPED));

        assertTrue(template.messages.isEmpty());
    }

    @Test
    void aStoppedBrokerNeverBreaksTheOrder() {
        RecordingTemplate template = new RecordingTemplate();
        template.failing = true;

        assertDoesNotThrow(() -> new RabbitOrderStatusEventPublisher(template, true).publish(event(OrderStatus.SHIPPED)));
    }
}
