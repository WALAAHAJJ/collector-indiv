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
import java.util.UUID;

/**
 * Publie les ventes sur le même échange RabbitMQ que les statuts d'annonce, avec la clé
 * {@code order.paid}. Comme pour les statuts, la publication est « au mieux » : une vente
 * déjà payée ne doit pas échouer parce que RabbitMQ est arrêté.
 *
 * <p>Le corps du message est le nom de l'annonce ; les autres informations sont dans les en-têtes.
 */
@Component
public class RabbitSaleEventPublisher implements SaleEventPublisher {

    public static final String ROUTING_KEY = "order.paid";

    private static final Logger LOGGER = LoggerFactory.getLogger(RabbitSaleEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final boolean enabled;

    public RabbitSaleEventPublisher(
            RabbitTemplate rabbitTemplate,
            @Value("${app.events.enabled:true}") boolean enabled
    ) {
        this.rabbitTemplate = rabbitTemplate;
        this.enabled = enabled;
    }

    @Override
    public void publish(SaleEvent event) {
        if (!enabled) {
            return;
        }

        try {
            rabbitTemplate.send(RabbitListingEventPublisher.EXCHANGE, ROUTING_KEY, toMessage(event));
        } catch (AmqpException exception) {
            LOGGER.warn("Vente non publiée pour la commande {} : {}",
                    event.orderId(), exception.getMessage());
        }
    }

    static Message toMessage(SaleEvent event) {
        MessageProperties properties = new MessageProperties();
        properties.setMessageId(UUID.randomUUID().toString());
        properties.setTimestamp(Date.from(event.occurredAt()));
        properties.setContentType(MessageProperties.CONTENT_TYPE_TEXT_PLAIN);
        properties.setContentEncoding(StandardCharsets.UTF_8.name());
        properties.setDeliveryMode(MessageDeliveryMode.PERSISTENT);
        properties.setHeader("orderId", event.orderId().toString());
        properties.setHeader("listingId", event.listingId().toString());
        properties.setHeader("sellerId", event.sellerId().toString());
        // en texte : un BigDecimal ne voyage pas de façon fiable dans un en-tête AMQP
        properties.setHeader("sellerNet", event.sellerNet().toPlainString());

        return new Message(event.listingName().getBytes(StandardCharsets.UTF_8), properties);
    }
}
