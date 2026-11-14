package com.collector.collection.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageDeliveryMode;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;

/**
 * Publie les changements de statut sur RabbitMQ.
 *
 * <p>La publication est « au mieux » : si RabbitMQ est arrêté, l'erreur est journalisée
 * et la requête de l'utilisateur réussit quand même. Une annonce ne doit jamais être
 * bloquée parce qu'une notification n'a pas pu partir.
 *
 * <p>Le corps du message est le nom de l'annonce ; les autres informations voyagent dans
 * les en-têtes AMQP, faits pour les métadonnées.
 */
@Component
public class RabbitListingEventPublisher implements ListingEventPublisher {

    public static final String EXCHANGE = "collector.events";

    private static final Logger LOGGER = LoggerFactory.getLogger(RabbitListingEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final boolean enabled;

    public RabbitListingEventPublisher(
            RabbitTemplate rabbitTemplate,
            @Value("${app.events.enabled:true}") boolean enabled
    ) {
        this.rabbitTemplate = rabbitTemplate;
        this.enabled = enabled;
    }

    @Override
    public void publish(ListingStatusEvent event) {
        if (!enabled) {
            return;
        }

        try {
            rabbitTemplate.send(EXCHANGE, routingKey(event), toMessage(event));
        } catch (AmqpException exception) {
            LOGGER.warn("Événement non publié pour l'annonce {} : {}",
                    event.listingId(), exception.getMessage());
        }
    }

    /** Clé de routage : listing.approved, listing.rejected ou listing.pending_review. */
    static String routingKey(ListingStatusEvent event) {
        return "listing." + event.status().name().toLowerCase(Locale.ROOT);
    }

    static Message toMessage(ListingStatusEvent event) {
        MessageProperties properties = new MessageProperties();
        properties.setMessageId(UUID.randomUUID().toString());
        properties.setTimestamp(Date.from(event.occurredAt()));
        properties.setContentType(MessageProperties.CONTENT_TYPE_TEXT_PLAIN);
        properties.setContentEncoding(StandardCharsets.UTF_8.name());
        properties.setDeliveryMode(MessageDeliveryMode.PERSISTENT);
        properties.setHeader("listingId", event.listingId().toString());
        properties.setHeader("ownerId", event.ownerId().toString());
        properties.setHeader("status", event.status().name());

        if (event.reason() != null) {
            properties.setHeader("reason", event.reason());
        }

        return new Message(event.listingName().getBytes(StandardCharsets.UTF_8), properties);
    }
}
