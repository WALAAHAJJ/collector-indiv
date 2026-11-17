package com.collector.collection.payment;

import java.math.BigDecimal;

/**
 * Le prestataire de paiement, vu du site. Le service des commandes ne connaît que ce contrat :
 * remplacer la simulation par un vrai prestataire (Stripe, par exemple) revient à écrire
 * une autre classe qui l'implémente, sans toucher au reste.
 */
public interface PaymentGateway {

    /**
     * Prélève le montant sur la carte.
     *
     * @throws PaymentDeclinedException si le paiement est refusé
     */
    void charge(CardDetails card, BigDecimal amount);
}
