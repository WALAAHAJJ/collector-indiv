package com.collector.collection.repository;

import com.collector.collection.domain.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<PurchaseOrder, UUID> {

    List<PurchaseOrder> findByBuyerIdOrderByCreatedAtDesc(UUID buyerId);

    List<PurchaseOrder> findBySellerIdOrderByCreatedAtDesc(UUID sellerId);
}
