package com.collector.collection.repository;

import com.collector.collection.domain.Collectible;
import com.collector.collection.domain.ListingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CollectibleRepository extends JpaRepository<Collectible, UUID> {

    List<Collectible> findByOwnerId(UUID ownerId);

    List<Collectible> findByStatus(ListingStatus status);

    long countByCategoryIgnoreCase(String category);

    @Query("""
            select c from Collectible c
            where c.status = :status
              and (:category = '' or c.category = :category)
              and lower(c.name) like lower(concat('%', :search, '%'))
            order by c.name
            """)
    List<Collectible> searchCatalog(
            @Param("status") ListingStatus status,
            @Param("category") String category,
            @Param("search") String search
    );
}
