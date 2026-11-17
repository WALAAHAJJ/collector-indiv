package com.collector.collection.events;

/** Annonce aux autres services qu'une vente vient d'avoir lieu. */
public interface SaleEventPublisher {

    void publish(SaleEvent event);
}
