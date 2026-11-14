package com.collector.collection.config;

import com.collector.collection.events.RabbitListingEventPublisher;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Déclare l'échange RabbitMQ sur lequel les événements d'annonces sont publiés. */
@Configuration
public class EventsConfig {

    @Bean
    TopicExchange collectorEvents() {
        return new TopicExchange(RabbitListingEventPublisher.EXCHANGE, true, false);
    }
}
