package com.collector.collection.payment;

/** Le paiement n'a pas abouti : carte invalide, expirée ou refusée. Aucun argent n'a été prélevé. */
public class PaymentDeclinedException extends RuntimeException {

    public PaymentDeclinedException(String reason) {
        super(reason);
    }
}
