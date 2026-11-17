package com.collector.collection.events;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Envoie l'événement de vente seulement une fois la transaction de l'achat validée (« commit »).
 *
 * <p>Sans cela, l'événement partirait pendant l'achat : si la base refusait ensuite
 * d'enregistrer la commande, le vendeur serait prévenu d'une vente qui n'a pas eu lieu.
 */
@Component
class SaleEventRelay {

    private final SaleEventPublisher publisher;

    SaleEventRelay(SaleEventPublisher publisher) {
        this.publisher = publisher;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    void onSale(SaleEvent event) {
        publisher.publish(event);
    }
}
