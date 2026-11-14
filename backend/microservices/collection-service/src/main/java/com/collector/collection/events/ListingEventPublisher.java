package com.collector.collection.events;

/** Annonce aux autres services qu'une annonce a changé de statut. */
public interface ListingEventPublisher {

    void publish(ListingStatusEvent event);
}
