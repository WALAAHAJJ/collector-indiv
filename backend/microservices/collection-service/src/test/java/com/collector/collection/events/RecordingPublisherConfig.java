package com.collector.collection.events;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/** Remplace la publication RabbitMQ par une liste en mémoire, pour vérifier ce qui serait envoyé. */
@TestConfiguration
public class RecordingPublisherConfig {

    @Bean
    @Primary
    RecordingPublisher recordingPublisher() {
        return new RecordingPublisher();
    }

    public static class RecordingPublisher implements ListingEventPublisher, SaleEventPublisher, OrderStatusEventPublisher {

        private final List<ListingStatusEvent> events = new CopyOnWriteArrayList<>();
        private final List<SaleEvent> sales = new CopyOnWriteArrayList<>();
        private final List<OrderStatusEvent> steps = new CopyOnWriteArrayList<>();

        @Override
        public void publish(ListingStatusEvent event) {
            events.add(event);
        }

        @Override
        public void publish(SaleEvent event) {
            sales.add(event);
        }

        @Override
        public void publish(OrderStatusEvent event) {
            steps.add(event);
        }

        public List<OrderStatusEvent> stepsOf(String listingId) {
            return steps.stream()
                    .filter(event -> event.listingId().toString().equals(listingId))
                    .toList();
        }

        public List<SaleEvent> salesOf(String listingId) {
            return sales.stream()
                    .filter(event -> event.listingId().toString().equals(listingId))
                    .toList();
        }

        public List<ListingStatusEvent> eventsFor(String listingId) {
            return events.stream()
                    .filter(event -> event.listingId().toString().equals(listingId))
                    .toList();
        }
    }
}
