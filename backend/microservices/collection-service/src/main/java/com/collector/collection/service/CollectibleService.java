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

    public CollectibleResponse findById(UUID id) {
        return toResponse(findEntityById(id));
    }

    public CollectibleResponse update(UUID id, UpdateCollectibleRequest request) {
        Collectible collectible = findEntityById(id);
        collectible.updateDetails(
                request.name(),
                request.category(),
                request.description()
        );

        return toResponse(repository.save(collectible));
    }

    public void delete(UUID id) {
        Collectible collectible = findEntityById(id);
        repository.delete(collectible);
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
                collectible.getDescription()
        );
    }
}