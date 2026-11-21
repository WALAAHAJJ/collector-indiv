package com.collector.payment.api;

import com.collector.payment.api.dto.ChargeRequest;
import com.collector.payment.api.dto.PaymentResponse;
import com.collector.payment.card.CardDeclinedException;
import com.collector.payment.card.CardDetails;
import com.collector.payment.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/** Le payeur est toujours celui du jeton de connexion, jamais celui que la requête prétendrait être. */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse charge(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChargeRequest request) {
        CardDetails card = new CardDetails(request.cardNumber(), request.cardHolder(), request.expiry(), request.cvc());

        try {
            return PaymentResponse.from(service.charge(currentUserId(jwt), request.amount(), card));
        } catch (CardDeclinedException exception) {
            // 402 Payment Required : le code HTTP prévu pour un paiement qui n'aboutit pas.
            throw new ResponseStatusException(HttpStatusCode.valueOf(402), exception.getMessage());
        }
    }

    @GetMapping("/{id}")
    public PaymentResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return PaymentResponse.from(service.get(id, currentUserId(jwt)));
    }

    @PostMapping("/{id}/refund")
    public PaymentResponse refund(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return PaymentResponse.from(service.refund(id, currentUserId(jwt)));
    }

    private UUID currentUserId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Jeton invalide");
        }
    }
}
