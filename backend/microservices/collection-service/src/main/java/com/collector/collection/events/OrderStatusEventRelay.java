package com.collector.collection.events;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** Envoie l'événement d'étape seulement une fois la transaction validée (même raison que pour les ventes). */
@Component
class OrderStatusEventRelay {

    private final OrderStatusEventPublisher publisher;

    OrderStatusEventRelay(OrderStatusEventPublisher publisher) {
        this.publisher = publisher;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void onStatusChange(OrderStatusEvent event) {
        publisher.publish(event);
    }
}
