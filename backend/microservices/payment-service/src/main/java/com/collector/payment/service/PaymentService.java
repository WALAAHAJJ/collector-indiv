package com.collector.payment.service;

import com.collector.payment.card.CardDeclinedException;
import com.collector.payment.card.CardDetails;
import com.collector.payment.card.CardValidator;
import com.collector.payment.domain.Payment;
import com.collector.payment.repository.PaymentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentRepository repository;
    private final CardValidator cardValidator;
    private final Clock clock;

    public PaymentService(PaymentRepository repository, CardValidator cardValidator, Clock clock) {
        this.repository = repository;
        this.cardValidator = cardValidator;
        this.clock = clock;
    }

    /**
     * Débite la carte. Un paiement refusé est quand même enregistré (état « refusé », avec son motif),
     * puis l'exception est relancée : {@code noRollbackFor} empêche l'annulation de cette trace.
     *
     * @throws CardDeclinedException si la carte est invalide, expirée ou refusée
     */
    @Transactional(noRollbackFor = CardDeclinedException.class)
    public Payment charge(UUID userId, BigDecimal amount, CardDetails card) {
        Instant now = Instant.now(clock);

        try {
            cardValidator.validate(card);
        } catch (CardDeclinedException exception) {
            repository.save(Payment.declined(userId, amount, card.last4(), exception.getMessage(), now));
            throw exception;
        }

        return repository.save(Payment.succeeded(userId, amount, card.last4(), now));
    }

    @Transactional(readOnly = true)
    public Payment get(UUID paymentId, UUID userId) {
        return ownedBy(paymentId, userId);
    }

    /** Rembourse un paiement accepté : 404 s'il n'est pas à l'utilisateur, 409 s'il n'est pas remboursable. */
    @Transactional
    public Payment refund(UUID paymentId, UUID userId) {
        Payment payment = ownedBy(paymentId, userId);

        try {
            payment.refund(Instant.now(clock));
        } catch (IllegalStateException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, exception.getMessage());
        }

        return repository.save(payment);
    }

    /** Le paiement d'un autre utilisateur est traité comme inexistant : on ne révèle pas qu'il existe. */
    private Payment ownedBy(UUID paymentId, UUID userId) {
        return repository.findById(paymentId)
                .filter(payment -> payment.getUserId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Paiement introuvable."));
    }
}
