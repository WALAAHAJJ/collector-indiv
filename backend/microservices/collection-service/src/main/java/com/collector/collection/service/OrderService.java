package com.collector.collection.service;

import com.collector.collection.api.dto.OrderResponse;
import com.collector.collection.api.dto.PurchaseRequest;
import com.collector.collection.domain.Collectible;
import com.collector.collection.domain.ListingStatus;
import com.collector.collection.domain.OrderStatus;
import com.collector.collection.domain.PurchaseOrder;
import com.collector.collection.events.SaleEvent;
import com.collector.collection.payment.CardDetails;
import com.collector.collection.payment.CommissionCalculator;
import com.collector.collection.payment.CommissionCalculator.Breakdown;
import com.collector.collection.payment.PaymentDeclinedException;
import com.collector.collection.payment.PaymentGateway;
import com.collector.collection.repository.CollectibleRepository;
import com.collector.collection.repository.OrderRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class OrderService {

    private final CollectibleRepository collectibleRepository;
    private final OrderRepository orderRepository;
    private final CommissionCalculator commissionCalculator;
    private final PaymentGateway paymentGateway;
    private final ApplicationEventPublisher events;

    public OrderService(
            CollectibleRepository collectibleRepository,
            OrderRepository orderRepository,
            CommissionCalculator commissionCalculator,
            PaymentGateway paymentGateway,
            ApplicationEventPublisher events
    ) {
        this.collectibleRepository = collectibleRepository;
        this.orderRepository = orderRepository;
        this.commissionCalculator = commissionCalculator;
        this.paymentGateway = paymentGateway;
        this.events = events;
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

        PurchaseOrder order = orderRepository.save(new PurchaseOrder(listing, buyerId, breakdown, card.last4()));

        // Transmis à SaleEventRelay, qui ne l'envoie à RabbitMQ qu'une fois la transaction validée.
        events.publishEvent(new SaleEvent(
                order.getId(),
                order.getListingId(),
                order.getSellerId(),
                order.getListingName(),
                order.getSellerNet(),
                Instant.now()
        ));

        return OrderResponse.from(order);
    }

    /** Le vendeur marque la commande comme expédiée. */
    @Transactional
    public OrderResponse ship(UUID userId, UUID orderId) {
        PurchaseOrder order = findForParticipant(userId, orderId);

        if (!order.getSellerId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul le vendeur peut expédier la commande.");
        }

        if (order.getStatus() != OrderStatus.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette commande n'est plus à expédier.");
        }

        order.markShipped();

        return OrderResponse.from(orderRepository.save(order));
    }

    /** L'acheteur confirme la réception du colis. */
    @Transactional
    public OrderResponse deliver(UUID userId, UUID orderId) {
        PurchaseOrder order = findForParticipant(userId, orderId);

        if (!order.getBuyerId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul l'acheteur peut confirmer la réception.");
        }

        if (order.getStatus() != OrderStatus.SHIPPED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette commande n'est pas en cours de livraison.");
        }

        order.markDelivered();

        return OrderResponse.from(orderRepository.save(order));
    }

    /** Une commande n'est visible que de son acheteur et de son vendeur : pour les autres, elle n'existe pas. */
    private PurchaseOrder findForParticipant(UUID userId, UUID orderId) {
        return orderRepository.findById(orderId)
                .filter(order -> order.getBuyerId().equals(userId) || order.getSellerId().equals(userId))
                .orElseThrow(this::notFound);
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
