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

    public static class RecordingPublisher implements ListingEventPublisher {

        private final List<ListingStatusEvent> events = new CopyOnWriteArrayList<>();

        @Override
        public void publish(ListingStatusEvent event) {
            events.add(event);
        }

        public List<ListingStatusEvent> eventsFor(String listingId) {
            return events.stream()
                    .filter(event -> event.listingId().toString().equals(listingId))
                    .toList();
        }
    }
}
