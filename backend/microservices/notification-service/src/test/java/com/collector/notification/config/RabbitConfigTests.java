package com.collector.notification.config;

import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RabbitConfigTests {

    private final RabbitConfig config = new RabbitConfig();

    @Test
    void exchangeMatchesTheOneDeclaredByTheListingService() {
        TopicExchange exchange = config.eventsExchange();

        assertEquals("collector.events", exchange.getName());
        assertTrue(exchange.isDurable());
        assertFalse(exchange.isAutoDelete());
    }

    @Test
    void queueIsDurable() {
        Queue queue = config.listingEventsQueue();

        assertEquals("notification.listing-events", queue.getName());
        assertTrue(queue.isDurable());
    }

    @Test
    void queueReceivesEveryListingDecision() {
        Binding binding = config.listingEventsBinding(config.listingEventsQueue(), config.eventsExchange());

        assertEquals("listing.*", binding.getRoutingKey());
        assertEquals("collector.events", binding.getExchange());
        assertEquals("notification.listing-events", binding.getDestination());
    }

    @Test
    void sameQueueAlsoReceivesSales() {
        Binding binding = config.saleEventsBinding(config.listingEventsQueue(), config.eventsExchange());

        assertEquals("order.paid", binding.getRoutingKey());
        assertEquals("collector.events", binding.getExchange());
        assertEquals("notification.listing-events", binding.getDestination());
    }

    @Test
    void sameQueueAlsoReceivesShippingAndDelivery() {
        Binding shipped = config.shippedEventsBinding(config.listingEventsQueue(), config.eventsExchange());
        Binding delivered = config.deliveredEventsBinding(config.listingEventsQueue(), config.eventsExchange());

        assertEquals("order.shipped", shipped.getRoutingKey());
        assertEquals("order.delivered", delivered.getRoutingKey());
        assertEquals("notification.listing-events", shipped.getDestination());
        assertEquals("notification.listing-events", delivered.getDestination());
    }
}
