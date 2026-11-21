package com.collector.collection.api.dto;

import com.collector.collection.domain.OrderStatus;
import com.collector.collection.domain.PurchaseOrder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record OrderResponse(
        UUID id,
        UUID listingId,
        String listingName,
        UUID buyerId,
        UUID sellerId,
        BigDecimal itemPrice,
        BigDecimal shippingCost,
        BigDecimal commission,
        BigDecimal buyerTotal,
        BigDecimal sellerNet,
        String cardLast4,
        Instant createdAt,
        OrderStatus status,
        Instant shippedAt,
        Instant deliveredAt,
        Instant refundedAt,
        String paymentId
) {

    public static OrderResponse from(PurchaseOrder order) {
        return new OrderResponse(
                order.getId(),
                order.getListingId(),
                order.getListingName(),
                order.getBuyerId(),
                order.getSellerId(),
                order.getItemPrice(),
                order.getShippingCost(),
                order.getCommission(),
                order.getBuyerTotal(),
                order.getSellerNet(),
                order.getCardLast4(),
                order.getCreatedAt(),
                order.getStatus(),
                order.getShippedAt(),
                order.getDeliveredAt(),
                order.getRefundedAt(),
                order.getPaymentId()
        );
    }
}
