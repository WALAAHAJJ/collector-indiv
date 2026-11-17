package com.collector.collection.events;

/** Annonce aux autres services qu'une commande a changé d'étape. */
public interface OrderStatusEventPublisher {

    void publish(OrderStatusEvent event);
}
