package com.collector.collection.domain;

import com.collector.collection.payment.CommissionCalculator;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PurchaseOrderTests {

    private PurchaseOrder newOrder() {
        Collectible listing = new Collectible(UUID.randomUUID(), "Montre", "Montres", "Belle montre",
                new BigDecimal("20.00"), new BigDecimal("3.00"), ItemCondition.GOOD);
        var breakdown = new CommissionCalculator(new BigDecimal("0.05"))
                .compute(listing.getPrice(), listing.getShippingCost());

        return new PurchaseOrder(listing, UUID.randomUUID(), breakdown, "4242");
    }

    @Test
    void aNewOrderIsPaidWithNoDates() {
        PurchaseOrder order = newOrder();

        assertEquals(OrderStatus.PAID, order.getStatus());
        assertNull(order.getShippedAt());
        assertNull(order.getDeliveredAt());
    }

    @Test
    void shippingMovesToShippedAndStampsTheDate() {
        PurchaseOrder order = newOrder();

        order.markShipped();

        assertEquals(OrderStatus.SHIPPED, order.getStatus());
        assertNotNull(order.getShippedAt());
        assertNull(order.getDeliveredAt());
    }

    @Test
    void deliveryFollowsShipping() {
        PurchaseOrder order = newOrder();
        order.markShipped();

        order.markDelivered();

        assertEquals(OrderStatus.DELIVERED, order.getStatus());
        assertNotNull(order.getDeliveredAt());
    }

    @Test
    void cannotDeliverBeforeShipping() {
        assertThrows(IllegalStateException.class, () -> newOrder().markDelivered());
    }

    @Test
    void cannotShipTwice() {
        PurchaseOrder order = newOrder();
        order.markShipped();

        assertThrows(IllegalStateException.class, order::markShipped);
    }

    @Test
    void cannotShipADeliveredOrder() {
        PurchaseOrder order = newOrder();
        order.markShipped();
        order.markDelivered();

        assertThrows(IllegalStateException.class, order::markShipped);
        assertThrows(IllegalStateException.class, order::markDelivered);
    }
}
