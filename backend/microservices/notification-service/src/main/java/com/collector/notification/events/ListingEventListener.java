package com.collector.notification.events;

import com.collector.notification.config.RabbitConfig;
import com.collector.notification.domain.NotificationType;
import com.collector.notification.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Transforme chaque événement d'annonce en notification pour son propriétaire.
 *
 * <p>Le corps du message est le nom de l'annonce ; l'identifiant de l'annonce, celui du propriétaire,
 * le statut et l'éventuel motif sont dans les en-têtes (voir le service des annonces).
 *
 * <p>Un message incomplet est journalisé puis abandonné : le renvoyer en boucle ne le réparerait pas.
 */
@Component
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
            handle(message);
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
