package com.collector.collection.repository;

import com.collector.collection.domain.Collectible;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CollectibleRepository extends JpaRepository<Collectible, UUID> {
    List<Collectible> findByOwnerId(UUID ownerId);
}
