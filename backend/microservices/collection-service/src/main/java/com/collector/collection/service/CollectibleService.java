package com.collector.collection.service;

import com.collector.collection.api.dto.CollectibleResponse;
import com.collector.collection.api.dto.CreateCollectibleRequest;
import com.collector.collection.api.dto.UpdateCollectibleRequest;
import com.collector.collection.domain.Collectible;
import com.collector.collection.domain.ListingStatus;
import com.collector.collection.repository.CollectibleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class CollectibleService {

    private final CollectibleRepository repository;
    private final ModerationService moderationService;

    public CollectibleService(
            CollectibleRepository repository,
            ModerationService moderationService
    ) {
        this.repository = repository;
        this.moderationService = moderationService;
    }

    public CollectibleResponse create(UUID ownerId, CreateCollectibleRequest request) {
        Collectible collectible = new Collectible(
                ownerId,
                request.name(),
                request.category(),
                request.description(),
                request.price(),
                request.shippingCost(),
                request.condition()
        );
        moderate(collectible);

        return toResponse(repository.save(collectible));
    }

    public List<CollectibleResponse> findByOwnerId(UUID ownerId) {
        return repository.findByOwnerId(ownerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<CollectibleResponse> findCatalog(String category, String search) {
        return repository.searchCatalog(
                        ListingStatus.APPROVED,
                        category == null ? "" : category.trim(),
                        search == null ? "" : search.trim()
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public CollectibleResponse findById(UUID id, UUID currentUserId) {
        Collectible collectible = findEntityById(id);

        boolean isOwner = collectible.getOwnerId().equals(currentUserId);
        boolean isPublic = collectible.getStatus() == ListingStatus.APPROVED;

        if (!isOwner && !isPublic) {
            throw notFound();
        }

        return toResponse(collectible);
    }

    public CollectibleResponse update(
            UUID id,
            UUID currentUserId,
            UpdateCollectibleRequest request
    ) {
        Collectible collectible = findOwnedEntity(id, currentUserId);
        collectible.updateDetails(
                request.name(),
                request.category(),
                request.description(),
                request.price(),
                request.shippingCost(),
                request.condition()
        );
        moderate(collectible);

        return toResponse(repository.save(collectible));
    }

    public void delete(UUID id, UUID currentUserId) {
        Collectible collectible = findOwnedEntity(id, currentUserId);
        repository.delete(collectible);
    }

    public List<CollectibleResponse> findByStatus(ListingStatus status) {
        return repository.findByStatus(status)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void moderate(Collectible collectible) {
        ModerationResult result = moderationService.evaluate(
                collectible.getName(),
                collectible.getDescription(),
                collectible.getPrice()
        );
        collectible.applyModeration(result.status(), result.reason());
    }

    private Collectible findOwnedEntity(UUID id, UUID currentUserId) {
        Collectible collectible = findEntityById(id);

        if (!collectible.getOwnerId().equals(currentUserId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé");
        }

        return collectible;
    }

    private Collectible findEntityById(UUID id) {
        return repository.findById(id).orElseThrow(this::notFound);
    }

    private ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Objet introuvable");
    }

    private CollectibleResponse toResponse(Collectible collectible) {
        return new CollectibleResponse(
                collectible.getId(),
                collectible.getOwnerId(),
                collectible.getName(),
                collectible.getCategory(),
                collectible.getDescription(),
                collectible.getPrice(),
                collectible.getShippingCost(),
                collectible.getCondition(),
                collectible.getStatus(),
                collectible.getModerationReason()
        );
    }
}
