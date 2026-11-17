package com.collector.collection.domain;

/** Avancement d'une commande : payée, puis expédiée par le vendeur, puis reçue par l'acheteur. */
public enum OrderStatus {
    PAID,
    SHIPPED,
    DELIVERED
}
