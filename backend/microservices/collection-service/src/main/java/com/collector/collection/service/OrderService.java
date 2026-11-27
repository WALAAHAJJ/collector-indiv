package com.collector.collection.service;

import com.collector.collection.api.dto.OrderResponse;
import com.collector.collection.api.dto.PurchaseRequest;
import com.collector.collection.domain.Collectible;
import com.collector.collection.domain.ListingStatus;
import com.collector.collection.domain.OrderStatus;
import com.collector.collection.domain.PurchaseOrder;
import com.collector.collection.events.OrderStatusEvent;
import com.collector.collection.events.SaleEvent;
import com.collector.collection.payment.CardDetails;
import com.collector.collection.payment.CommissionCalculator;
import com.collector.collection.payment.CommissionCalculator.Breakdown;
import com.collector.collection.payment.PaymentDeclinedException;
import com.collector.collection.payment.PaymentGateway;
import com.collector.collection.payment.PaymentReceipt;
import com.collector.collection.payment.PaymentUnavailableException;
import com.collector.collection.repository.CollectibleRepository;
import com.collector.collection.repository.OrderRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

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

        PaymentReceipt receipt;
        try {
            receipt = paymentGateway.charge(card, breakdown.buyerTotal());
        } catch (PaymentDeclinedException exception) {
            // 402 Payment Required : le code HTTP prévu pour un paiement qui n'aboutit pas.
            throw new ResponseStatusException(HttpStatusCode.valueOf(402), exception.getMessage());
        } catch (PaymentUnavailableException exception) {
            log.warn("Service de paiement indisponible : {}", exception.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Le paiement est momentanément indisponible, aucun montant n'a été débité. Réessayez dans un instant.");
        }

        // L'argent est parti : si la transaction n'aboutit pas, on rembourse.
        refundUnlessCommitted(receipt.paymentId());

        listing.markSold();
        collectibleRepository.save(listing);

        PurchaseOrder order = orderRepository.save(new PurchaseOrder(listing, buyerId, breakdown, card.last4(), receipt.paymentId()));

        // Transmis à SaleEventRelay, qui ne l'envoie à RabbitMQ qu'une fois la transaction validée.
        events.publishEvent(new SaleEvent(
                order.getId(),
                order.getListingId(),
                order.getSellerId(),
                order.getBuyerId(),
                order.getListingName(),
                order.getSellerNet(),
                Instant.now()
        ));

        return OrderResponse.from(order);
    }

    /**
     * Compensation : le paiement vit dans un autre service, il ne peut pas être annulé par la base de données.
     * Une fois la transaction terminée (validée ou annulée), on rembourse si elle n'a pas été validée,
     * y compris quand c'est le commit lui-même qui échoue.
     */
    private void refundUnlessCommitted(String paymentId) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_COMMITTED) {
                    return;
                }
                try {
                    paymentGateway.refund(paymentId);
                } catch (RuntimeException exception) {
                    // À rapprocher à la main : le paiement est resté débité sans commande.
                    log.error("Achat annulé mais remboursement impossible pour le paiement {}", paymentId, exception);
                }
            }
        });
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
        orderRepository.save(order);
        announce(order);

        return OrderResponse.from(order);
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
        orderRepository.save(order);
        announce(order);

        return OrderResponse.from(order);
    }

    /** Transmis à OrderStatusEventRelay, qui ne l'envoie à RabbitMQ qu'une fois la transaction validée. */
    private void announce(PurchaseOrder order) {
        events.publishEvent(new OrderStatusEvent(
                order.getId(),
                order.getListingId(),
                order.getBuyerId(),
                order.getSellerId(),
                order.getListingName(),
                order.getStatus(),
                Instant.now()
        ));
    }

    /** Une commande n'est visible que de son acheteur et de son vendeur : pour les autres, elle n'existe pas. */
    private PurchaseOrder findForParticipant(UUID userId, UUID orderId) {
        return orderRepository.findById(orderId)
                .filter(order -> order.getBuyerId().equals(userId) || order.getSellerId().equals(userId))
                .orElseThrow(this::notFound);
    }

    /**
     * Remboursement décidé par l'administration. Le paiement est rendu à l'acheteur par payment-service ;
     * si la commande n'était pas encore expédiée, l'objet est remis en vente.
     */
    @Transactional
    public OrderResponse refund(UUID orderId) {
        PurchaseOrder order = orderRepository.findById(orderId).orElseThrow(this::notFound);

        if (order.getStatus() == OrderStatus.REFUNDED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette commande est déjà remboursée.");
        }

        if (order.getPaymentId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cette commande n'a pas de paiement à rembourser (commande antérieure au service de paiement).");
        }

        boolean notShippedYet = order.getStatus() == OrderStatus.PAID;

        try {
            paymentGateway.refund(order.getPaymentId());
        } catch (PaymentUnavailableException exception) {
            log.warn("Remboursement impossible pour la commande {} : {}", orderId, exception.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Le remboursement est momentanément indisponible. Réessayez dans un instant.");
        }

        order.markRefunded();
        orderRepository.save(order);
        announce(order);

        if (notShippedYet) {
            collectibleRepository.findById(order.getListingId()).ifPresent(listing -> {
                listing.relist();
                collectibleRepository.save(listing);
            });
        }

        return OrderResponse.from(order);
    }

    /** Toutes les commandes du site, les plus récentes d'abord (back-office). */
    public List<OrderResponse> allOrders() {
        return orderRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(OrderResponse::from)
                .toList();
    }

    /** Commande dont l'utilisateur est l'acheteur : seul lui peut télécharger le reçu. */
    public PurchaseOrder purchaseOf(UUID buyerId, UUID orderId) {
        return orderRepository.findById(orderId)
                .filter(order -> order.getBuyerId().equals(buyerId))
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
