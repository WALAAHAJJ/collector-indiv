package com.collector.collection.service;

import com.collector.collection.api.dto.CollectibleResponse;
import com.collector.collection.api.dto.CreateCollectibleRequest;
import com.collector.collection.api.dto.UpdateCollectibleRequest;
import com.collector.collection.domain.Collectible;
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

    public CollectibleResponse create(CreateCollectibleRequest request) {
        Collectible collectible = new Collectible(
                request.ownerId(),
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
                        com.collector.collection.domain.ListingStatus.APPROVED,
                        category == null ? "" : category.trim(),
                        search == null ? "" : search.trim()
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public CollectibleResponse findById(UUID id) {
        return toResponse(findEntityById(id));
    }

    public CollectibleResponse update(UUID id, UpdateCollectibleRequest request) {
        Collectible collectible = findEntityById(id);
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

    public void delete(UUID id) {
        Collectible collectible = findEntityById(id);
        repository.delete(collectible);
    }

    private void moderate(Collectible collectible) {
        ModerationResult result = moderationService.evaluate(
                collectible.getName(),
                collectible.getDescription(),
                collectible.getPrice()
        );
        collectible.applyModeration(result.status(), result.reason());
    }

    private Collectible findEntityById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Objet introuvable"
                ));
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
