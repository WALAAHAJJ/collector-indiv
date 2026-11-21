package com.collector.collection.api;

import com.collector.collection.api.dto.OrderResponse;
import com.collector.collection.api.dto.PurchaseRequest;
import com.collector.collection.domain.PurchaseOrder;
import com.collector.collection.receipt.ReceiptPdf;
import com.collector.collection.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ContentDisposition;
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

import java.util.List;
import java.util.UUID;

/** Achats et ventes de l'utilisateur connecté. L'acheteur est toujours celui du jeton, jamais celui de la requête. */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService service;

    public OrderController(OrderService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse purchase(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PurchaseRequest request
    ) {
        return service.purchase(currentUserId(jwt), request);
    }

    @PostMapping("/{id}/ship")
    public OrderResponse ship(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return service.ship(currentUserId(jwt), id);
    }

    @PostMapping("/{id}/deliver")
    public OrderResponse deliver(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        return service.deliver(currentUserId(jwt), id);
    }

    @GetMapping("/purchases")
    public List<OrderResponse> purchases(@AuthenticationPrincipal Jwt jwt) {
        return service.purchasesOf(currentUserId(jwt));
    }

    /** Reçu d'achat en PDF : réservé à l'acheteur. */
    @GetMapping("/{id}/receipt")
    public ResponseEntity<byte[]> receipt(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        PurchaseOrder order = service.purchaseOf(currentUserId(jwt), id);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(ReceiptPdf.fileName(order)).build().toString())
                .body(ReceiptPdf.render(order));
    }

    @GetMapping("/sales")
    public List<OrderResponse> sales(@AuthenticationPrincipal Jwt jwt) {
        return service.salesOf(currentUserId(jwt));
    }

    private UUID currentUserId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Jeton invalide");
        }
    }
}
