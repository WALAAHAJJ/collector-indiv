package com.collector.notification.events;

import com.collector.notification.config.RabbitConfig;
import com.collector.notification.domain.NotificationType;
import com.collector.notification.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Transforme chaque événement en notification : une décision sur une annonce prévient son propriétaire,
 * une vente (clé {@code order.paid}) prévient le vendeur,
 * une expédition ({@code order.shipped}) prévient l'acheteur, une réception ({@code order.delivered}) le vendeur.
 *
 * <p>Le corps du message est le nom de l'annonce ; l'identifiant de l'annonce, celui du propriétaire,
 * le statut et l'éventuel motif sont dans les en-têtes (voir le service des annonces).
 *
 * <p>Un message incomplet est journalisé puis abandonné : le renvoyer en boucle ne le réparerait pas.
 *
 * <p>L'écouteur n'existe que si {@code app.events.enabled} vaut {@code true} (valeur par défaut) :
 * les tests le désactivent pour ne pas chercher de RabbitMQ, et appellent la méthode directement.
 */
@Component
@ConditionalOnProperty(name = "app.events.enabled", havingValue = "true", matchIfMissing = true)
public class ListingEventListener {

    private static final Logger LOGGER = LoggerFactory.getLogger(ListingEventListener.class);

    /** La colonne « message » accepte 500 caractères ; le nom (120) et le motif (255) tiennent largement. */
    private static final int MAX_MESSAGE_LENGTH = 500;

    private final NotificationService service;

    public ListingEventListener(NotificationService service) {
        this.service = service;
    }

    @RabbitListener(queues = RabbitConfig.QUEUE)
    public void onListingEvent(Message message) {
        try {
            String routingKey = message.getMessageProperties().getReceivedRoutingKey();
            if (RabbitConfig.SALE_ROUTING_KEY.equals(routingKey)) {
                handleSale(message);
            } else if (RabbitConfig.SHIPPED_ROUTING_KEY.equals(routingKey)) {
                handleOrderStep(message, "buyerId", NotificationType.ORDER_SHIPPED);
            } else if (RabbitConfig.DELIVERED_ROUTING_KEY.equals(routingKey)) {
                handleOrderStep(message, "sellerId", NotificationType.ORDER_DELIVERED);
            } else {
                handle(message);
            }
        } catch (IllegalArgumentException exception) {
            LOGGER.warn("Événement d'annonce ignoré : {}", exception.getMessage());
        }
    }

    private void handle(Message message) {
        UUID ownerId = uuidHeader(message, "ownerId");
        UUID listingId = uuidHeader(message, "listingId");
        String status = header(message, "status");
        String listingName = new String(message.getBody(), StandardCharsets.UTF_8);
        String reason = optionalHeader(message, "reason");

        NotificationType type = typeOf(status);
        service.create(ownerId, type, text(type, listingName, reason), listingId);
    }

    /** Corps : nom de l'annonce ; en-têtes : sellerId, listingId et sellerNet (gain net, en texte). */
    private void handleSale(Message message) {
        UUID sellerId = uuidHeader(message, "sellerId");
        UUID listingId = uuidHeader(message, "listingId");
        BigDecimal sellerNet = new BigDecimal(header(message, "sellerNet"));
        String listingName = new String(message.getBody(), StandardCharsets.UTF_8);

        service.create(sellerId, NotificationType.ORDER_SOLD, saleText(listingName, sellerNet), listingId);
    }

    /** Corps : nom de l'annonce ; en-têtes : listingId et l'identifiant du destinataire (acheteur ou vendeur). */
    private void handleOrderStep(Message message, String recipientHeader, NotificationType type) {
        UUID recipientId = uuidHeader(message, recipientHeader);
        UUID listingId = uuidHeader(message, "listingId");
        String listingName = new String(message.getBody(), StandardCharsets.UTF_8);

        service.create(recipientId, type, orderStepText(type, listingName), listingId);
    }

    static String orderStepText(NotificationType type, String listingName) {
        String text = switch (type) {
            case ORDER_SHIPPED -> "Votre commande « " + listingName
                    + " » a été expédiée. Confirmez la réception dès que vous l'avez reçue.";
            case ORDER_DELIVERED -> "Bonne nouvelle : l'acheteur a confirmé la réception de « " + listingName + " ».";
            default -> throw new IllegalArgumentException("pas une étape de commande : " + type);
        };

        return text.length() <= MAX_MESSAGE_LENGTH ? text : text.substring(0, MAX_MESSAGE_LENGTH);
    }

    static String saleText(String listingName, BigDecimal sellerNet) {
        String amount = sellerNet.setScale(2, RoundingMode.HALF_UP).toPlainString().replace('.', ',');
        String text = "Bonne nouvelle : « " + listingName + " » est vendu ! Vous gagnez " + amount
                + " € (commission du site déduite, frais d'expédition inclus).";

        return text.length() <= MAX_MESSAGE_LENGTH ? text : text.substring(0, MAX_MESSAGE_LENGTH);
    }

    static NotificationType typeOf(String status) {
        return switch (status) {
            case "APPROVED" -> NotificationType.LISTING_APPROVED;
            case "REJECTED" -> NotificationType.LISTING_REJECTED;
            case "PENDING_REVIEW" -> NotificationType.LISTING_PENDING_REVIEW;
            default -> throw new IllegalArgumentException("statut inconnu : " + status);
        };
    }

    static String text(NotificationType type, String listingName, String reason) {
        String text = switch (type) {
            case LISTING_APPROVED ->
                    "Votre annonce « " + listingName + " » a été approuvée et apparaît dans le catalogue.";
            case LISTING_REJECTED -> reason == null
                    ? "Votre annonce « " + listingName + " » a été refusée."
                    : "Votre annonce « " + listingName + " » a été refusée : " + reason;
            case LISTING_PENDING_REVIEW ->
                    "Votre annonce « " + listingName + " » est en attente de validation par un administrateur.";
            case ORDER_SOLD -> throw new IllegalArgumentException("une vente se rédige avec saleText");
            case ORDER_SHIPPED, ORDER_DELIVERED ->
                    throw new IllegalArgumentException("une étape de commande se rédige avec orderStepText");
        };

        return text.length() <= MAX_MESSAGE_LENGTH ? text : text.substring(0, MAX_MESSAGE_LENGTH);
    }

    private static String optionalHeader(Message message, String name) {
        Object value = message.getMessageProperties().getHeader(name);
        return value == null ? null : value.toString();
    }

    private static String header(Message message, String name) {
        String value = optionalHeader(message, name);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("en-tête « " + name + " » manquant");
        }
        return value;
    }

    private static UUID uuidHeader(Message message, String name) {
        try {
            return UUID.fromString(header(message, name));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("en-tête « " + name + " » invalide", exception);
        }
    }
}
