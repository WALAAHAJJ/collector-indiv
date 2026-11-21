package com.collector.collection.payment;

/** Le justificatif d'un paiement accepté : son identifiant dans le service de paiement (pour un éventuel remboursement). */
public record PaymentReceipt(String paymentId) {
}
