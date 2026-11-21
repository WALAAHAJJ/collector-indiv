package com.collector.collection.payment;

import java.math.BigDecimal;

/**
 * Le prestataire de paiement, vu du site. Le service des commandes ne connaît que ce contrat :
 * le paiement est fait par un autre service (payment-service), joint en HTTP par {@link RemotePaymentGateway}.
 */
public interface PaymentGateway {

    /**
     * Prélève le montant sur la carte.
     *
     * @throws PaymentDeclinedException si le paiement est refusé
     * @throws PaymentUnavailableException si le service de paiement ne répond pas correctement
     */
    PaymentReceipt charge(CardDetails card, BigDecimal amount);

    /**
     * Rembourse un paiement accepté (compensation d'un achat qui n'a pas pu aboutir).
     *
     * @throws PaymentUnavailableException si le remboursement n'a pas pu être demandé
     */
    void refund(String paymentId);
}
