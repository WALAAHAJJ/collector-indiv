package com.collector.collection.api;

import com.collector.collection.api.dto.OrderResponse;
import com.collector.collection.service.OrderService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Back-office : commandes du site et remboursements. Réservé au rôle ADMIN (voir SecurityConfig). */
@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    private final OrderService service;

    public AdminOrderController(OrderService service) {
        this.service = service;
    }

    @GetMapping
    public List<OrderResponse> all() {
        return service.allOrders();
    }

    @PostMapping("/{id}/refund")
    public OrderResponse refund(@PathVariable UUID id) {
        return service.refund(id);
    }
}
