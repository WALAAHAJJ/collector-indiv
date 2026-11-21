package com.collector.payment.domain;

/** Où en est un paiement : débité, refusé par la banque, ou remboursé après coup. */
public enum PaymentStatus {
    SUCCEEDED,
    DECLINED,
    REFUNDED
}
