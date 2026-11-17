package com.collector.collection.domain;

public enum ListingStatus {
    PENDING_REVIEW,
    APPROVED,
    REJECTED,
    /** Achetée : l'annonce quitte le catalogue et n'est plus modifiable. */
    SOLD
}
