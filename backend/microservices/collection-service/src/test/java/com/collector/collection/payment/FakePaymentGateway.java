package com.collector.collection.payment;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Remplace le vrai service de paiement dans les tests : mêmes cartes de test que payment-service
 * (4242… accepté, 4000 0000 0000 0002 refusé, carte expirée refusée), et garde la trace des appels.
 */
@Component
@Primary
public class FakePaymentGateway implements PaymentGateway {

    private final List<String> charged = new CopyOnWriteArrayList<>();
    private final List<String> refunded = new CopyOnWriteArrayList<>();
    private final AtomicBoolean down = new AtomicBoolean(false);

    @Override
    public PaymentReceipt charge(CardDetails card, BigDecimal amount) {
        if (down.get()) {
            throw new PaymentUnavailableException("Service de paiement arrêté (test).");
        }
        if (card.number().replace(" ", "").equals("4000000000000002")) {
            throw new PaymentDeclinedException("Paiement refusé par la banque.");
        }
        if (isExpired(card.expiry())) {
            throw new PaymentDeclinedException("Carte expirée.");
        }

        String id = UUID.randomUUID().toString();
        charged.add(id);
        return new PaymentReceipt(id);
    }

    @Override
    public void refund(String paymentId) {
        refunded.add(paymentId);
    }

    public List<String> charged() {
        return charged;
    }

    public List<String> refunded() {
        return refunded;
    }

    /** Simule un service de paiement arrêté. */
    public void setDown(boolean value) {
        down.set(value);
    }

    private static boolean isExpired(String expiry) {
        String[] parts = expiry.split("/");
        YearMonth end = YearMonth.of(2000 + Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
        return end.isBefore(YearMonth.now());
    }
}
