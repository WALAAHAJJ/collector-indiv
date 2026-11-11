package com.collector.collection.service;

import com.collector.collection.api.dto.CollectibleResponse;
import com.collector.collection.api.dto.CreateCollectibleRequest;
import com.collector.collection.domain.Collectible;
import com.collector.collection.repository.CollectibleRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class CollectibleService {

    private final CollectibleRepository repository;

    public CollectibleService(CollectibleRepository repository) {
        this.repository = repository;
    }

    public CollectibleResponse create(CreateCollectibleRequest request) {
        Collectible collectible = new Collectible(
                request.ownerId(),
                request.name(),
                request.category(),
                request.description()
        );

        return toResponse(repository.save(collectible));
    }

    public List<CollectibleResponse> findByOwnerId(UUID ownerId) {
        return repository.findByOwnerId(ownerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private CollectibleResponse toResponse(Collectible collectible) {
        return new CollectibleResponse(
                collectible.getId(),
                collectible.getOwnerId(),
                collectible.getName(),
                collectible.getCategory(),
                collectible.getDescription()
        );
    }
}
