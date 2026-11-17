package com.collector.collection.service;

import com.collector.collection.api.dto.OrderResponse;
import com.collector.collection.api.dto.PurchaseRequest;
import com.collector.collection.domain.Collectible;
import com.collector.collection.domain.ListingStatus;
import com.collector.collection.domain.PurchaseOrder;
import com.collector.collection.payment.CardDetails;
import com.collector.collection.payment.CommissionCalculator;
import com.collector.collection.payment.CommissionCalculator.Breakdown;
import com.collector.collection.payment.PaymentDeclinedException;
import com.collector.collection.payment.PaymentGateway;
import com.collector.collection.repository.CollectibleRepository;
import com.collector.collection.repository.OrderRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class OrderService {

    private final CollectibleRepository collectibleRepository;
    private final OrderRepository orderRepository;
    private final CommissionCalculator commissionCalculator;
    private final PaymentGateway paymentGateway;

    public OrderService(
            CollectibleRepository collectibleRepository,
            OrderRepository orderRepository,
            CommissionCalculator commissionCalculator,
            PaymentGateway paymentGateway
    ) {
        this.collectibleRepository = collectibleRepository;
        this.orderRepository = orderRepository;
        this.commissionCalculator = commissionCalculator;
        this.paymentGateway = paymentGateway;
    }

    /**
     * Achète une annonce : tout ou rien. L'annonce est verrouillée, contrôlée, payée, puis marquée
     * vendue et la commande enregistrée dans la même transaction. Si le paiement est refusé, rien
     * n'est modifié et l'annonce reste en vente.
     */
    @Transactional
    public OrderResponse purchase(UUID buyerId, PurchaseRequest request) {
        Collectible listing = collectibleRepository.findByIdForUpdate(request.listingId())
                .orElseThrow(this::notFound);

        if (listing.getStatus() == ListingStatus.SOLD) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette annonce est déjà vendue.");
        }

        // Une annonce non validée n'est pas publique : on ne révèle même pas qu'elle existe.
        if (listing.getStatus() != ListingStatus.APPROVED) {
            throw notFound();
        }

        if (listing.getOwnerId().equals(buyerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Vous ne pouvez pas acheter votre propre annonce.");
        }

        Breakdown breakdown = commissionCalculator.compute(listing.getPrice(), listing.getShippingCost());
        CardDetails card = new CardDetails(
                request.cardNumber(), request.cardHolder(), request.expiry(), request.cvc());

        try {
            paymentGateway.charge(card, breakdown.buyerTotal());
        } catch (PaymentDeclinedException exception) {
            // 402 Payment Required : le code HTTP prévu pour un paiement qui n'aboutit pas.
            throw new ResponseStatusException(HttpStatusCode.valueOf(402), exception.getMessage());
        }

        listing.markSold();
        collectibleRepository.save(listing);

        PurchaseOrder order = orderRepository.save(new PurchaseOrder(
                listing.getId(),
                listing.getName(),
                buyerId,
                listing.getOwnerId(),
                breakdown.itemPrice(),
                breakdown.shippingCost(),
                breakdown.commission(),
                breakdown.buyerTotal(),
                breakdown.sellerNet(),
                card.last4()
        ));

        return OrderResponse.from(order);
    }

    public List<OrderResponse> purchasesOf(UUID buyerId) {
        return orderRepository.findByBuyerIdOrderByCreatedAtDesc(buyerId)
                .stream()
                .map(OrderResponse::from)
                .toList();
    }

    public List<OrderResponse> salesOf(UUID sellerId) {
        return orderRepository.findBySellerIdOrderByCreatedAtDesc(sellerId)
                .stream()
                .map(OrderResponse::from)
                .toList();
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Objet introuvable");
    }
}
