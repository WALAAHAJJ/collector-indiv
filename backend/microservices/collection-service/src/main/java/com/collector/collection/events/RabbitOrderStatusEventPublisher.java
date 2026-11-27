package com.collector.collection.events;

import com.collector.collection.domain.OrderStatus;
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
import java.util.UUID;

/**
 * Publie l'expédition ({@code order.shipped}), la réception ({@code order.delivered}) et le remboursement
 * ({@code order.refunded}) sur l'échange des événements. Comme pour les ventes, la publication est « au mieux » : une commande déjà mise à jour
 * ne doit pas échouer parce que RabbitMQ est arrêté.
 *
 * <p>Le corps est le nom de l'annonce ; les identifiants de la commande, de l'annonce, de l'acheteur
 * et du vendeur sont dans les en-têtes : le service de notifications choisit lui-même le destinataire.
 */
@Component
public class RabbitOrderStatusEventPublisher implements OrderStatusEventPublisher {

    public static final String SHIPPED_KEY = "order.shipped";
    public static final String DELIVERED_KEY = "order.delivered";
    public static final String REFUNDED_KEY = "order.refunded";

    private static final Logger LOGGER = LoggerFactory.getLogger(RabbitOrderStatusEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final boolean enabled;

    public RabbitOrderStatusEventPublisher(
            RabbitTemplate rabbitTemplate,
            @Value("${app.events.enabled:true}") boolean enabled
    ) {
        this.rabbitTemplate = rabbitTemplate;
        this.enabled = enabled;
    }

    @Override
    public void publish(OrderStatusEvent event) {
        if (!enabled) {
            return;
        }

        String routingKey = routingKeyOf(event.status());
        if (routingKey == null) {
            return;
        }

        try {
            rabbitTemplate.send(RabbitListingEventPublisher.EXCHANGE, routingKey, toMessage(event));
        } catch (AmqpException exception) {
            LOGGER.warn("Étape de commande non publiée pour la commande {} : {}",
                    event.orderId(), exception.getMessage());
        }
    }

    /** PAID n'a pas de clé ici : le paiement est annoncé par {@code order.paid}. le remboursement a la sienne. */
    static String routingKeyOf(OrderStatus status) {
        return switch (status) {
            case SHIPPED -> SHIPPED_KEY;
            case DELIVERED -> DELIVERED_KEY;
            case REFUNDED -> REFUNDED_KEY;
            case PAID -> null;
        };
    }

    static Message toMessage(OrderStatusEvent event) {
        MessageProperties properties = new MessageProperties();
        properties.setMessageId(UUID.randomUUID().toString());
        properties.setTimestamp(Date.from(event.occurredAt()));
        properties.setContentType(MessageProperties.CONTENT_TYPE_TEXT_PLAIN);
        properties.setContentEncoding(StandardCharsets.UTF_8.name());
        properties.setDeliveryMode(MessageDeliveryMode.PERSISTENT);
        properties.setHeader("orderId", event.orderId().toString());
        properties.setHeader("listingId", event.listingId().toString());
        properties.setHeader("buyerId", event.buyerId().toString());
        properties.setHeader("sellerId", event.sellerId().toString());

        return new Message(event.listingName().getBytes(StandardCharsets.UTF_8), properties);
    }
}
