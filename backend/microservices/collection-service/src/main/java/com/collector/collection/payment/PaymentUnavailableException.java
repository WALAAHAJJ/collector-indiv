package com.collector.collection.payment;

/** Le service de paiement ne répond pas ou répond une erreur : on ne sait pas si l'argent a bougé. */
public class PaymentUnavailableException extends RuntimeException {

    public PaymentUnavailableException(String reason) {
        super(reason);
    }

    public PaymentUnavailableException(String reason, Throwable cause) {
        super(reason, cause);
    }
}
