package com.collector.payment.card;

/** Le paiement n'a pas abouti : carte invalide, expirée ou refusée. Aucun argent n'a été prélevé. */
public class CardDeclinedException extends RuntimeException {

    public CardDeclinedException(String reason) {
        super(reason);
    }
}
