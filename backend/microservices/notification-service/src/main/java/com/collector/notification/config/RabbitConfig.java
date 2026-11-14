package com.collector.notification.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Déclare ce dont le service a besoin dans RabbitMQ : sa propre file, liée à l'échange
 * des annonces. Chaque service abonné a sa file ; ainsi un futur service (fraude, statistiques)
 * reçoit lui aussi tous les événements sans que celui-ci en perde.
 */
@Configuration
public class RabbitConfig {

    /** Même nom et mêmes options que dans le service des annonces, sinon RabbitMQ refuse la déclaration. */
    public static final String EXCHANGE = "collector.events";

    public static final String QUEUE = "notification.listing-events";

    /** Toutes les décisions sur une annonce : listing.approved, listing.rejected, listing.pending_review. */
    public static final String ROUTING_KEY = "listing.*";

    @Bean
    TopicExchange eventsExchange() {
        return new TopicExchange(EXCHANGE, true, false);
    }

    @Bean
    Queue listingEventsQueue() {
        return QueueBuilder.durable(QUEUE).build();
    }

    @Bean
    Binding listingEventsBinding(Queue listingEventsQueue, TopicExchange eventsExchange) {
        return BindingBuilder.bind(listingEventsQueue).to(eventsExchange).with(ROUTING_KEY);
    }
}
