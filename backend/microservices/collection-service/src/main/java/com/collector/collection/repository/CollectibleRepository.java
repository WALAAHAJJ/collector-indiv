package com.collector.collection.repository;

import com.collector.collection.domain.Collectible;
import com.collector.collection.domain.ListingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CollectibleRepository extends JpaRepository<Collectible, UUID> {

    List<Collectible> findByOwnerId(UUID ownerId);

    List<Collectible> findByStatus(ListingStatus status);

    /**
     * Lit l'annonce en la verrouillant jusqu'à la fin de la transaction : si deux acheteurs
     * cliquent en même temps, le second attend, puis voit « vendue » et reçoit un refus propre.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Collectible c where c.id = :id")
    Optional<Collectible> findByIdForUpdate(@Param("id") UUID id);

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
