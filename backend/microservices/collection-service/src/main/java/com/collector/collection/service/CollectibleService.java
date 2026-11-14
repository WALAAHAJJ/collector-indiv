package com.collector.collection.service;

import com.collector.collection.api.dto.CollectibleResponse;
import com.collector.collection.api.dto.CreateCollectibleRequest;
import com.collector.collection.api.dto.UpdateCollectibleRequest;
import com.collector.collection.domain.Category;
import com.collector.collection.domain.Collectible;
import com.collector.collection.domain.ListingPhoto;
import com.collector.collection.domain.ListingStatus;
import com.collector.collection.domain.PhotoFormat;
import com.collector.collection.repository.CollectibleRepository;
import com.collector.collection.repository.ListingPhotoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class CollectibleService {

    private final CollectibleRepository repository;
    private final ListingPhotoRepository photoRepository;
    private final ModerationService moderationService;
    private final CategoryService categoryService;

    public CollectibleService(
            CollectibleRepository repository,
            ListingPhotoRepository photoRepository,
            ModerationService moderationService,
            CategoryService categoryService
    ) {
        this.repository = repository;
        this.photoRepository = photoRepository;
        this.moderationService = moderationService;
        this.categoryService = categoryService;
    }

    public CollectibleResponse create(UUID ownerId, CreateCollectibleRequest request) {
        Category category = categoryService.requireByName(request.category());

        Collectible collectible = new Collectible(
                ownerId,
                request.name(),
                category.getName(),
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
        Category category = categoryService.requireByName(request.category());

        collectible.updateDetails(
                request.name(),
                category.getName(),
                request.description(),
                request.price(),
                request.shippingCost(),
                request.condition()
        );
        moderate(collectible);

        return toResponse(repository.save(collectible));
    }

    @Transactional
    public void delete(UUID id, UUID currentUserId) {
        Collectible collectible = findOwnedEntity(id, currentUserId);
        photoRepository.deleteById(id);
        repository.delete(collectible);
    }

    /** Ajoute ou remplace la photo d'une annonce de l'utilisateur. Le format est lu dans le contenu du fichier. */
    @Transactional
    public CollectibleResponse savePhoto(UUID id, UUID currentUserId, byte[] data) {
        Collectible collectible = findOwnedEntity(id, currentUserId);

        if (data.length > PhotoFormat.MAX_BYTES) {
            throw new ResponseStatusException(
                    HttpStatusCode.valueOf(413), "La photo dépasse 1 Mo.");
        }

        String contentType = PhotoFormat.detect(data).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Format de photo non pris en charge : JPEG, PNG ou WebP."));

        photoRepository.save(new ListingPhoto(id, contentType, data));
        collectible.markPhoto(true);

        return toResponse(repository.save(collectible));
    }

    @Transactional
    public CollectibleResponse deletePhoto(UUID id, UUID currentUserId) {
        Collectible collectible = findOwnedEntity(id, currentUserId);

        photoRepository.deleteById(id);
        collectible.markPhoto(false);

        return toResponse(repository.save(collectible));
    }

    /**
     * Lit la photo d'une annonce. Les annonces approuvées sont publiques ; les autres
     * ne sont visibles que par leur propriétaire et par les administrateurs.
     * {@code currentUserId} vaut {@code null} pour un visiteur non connecté.
     */
    public ListingPhoto findPhoto(UUID id, UUID currentUserId, boolean admin) {
        Collectible collectible = findEntityById(id);

        boolean isOwner = currentUserId != null && collectible.getOwnerId().equals(currentUserId);
        boolean isPublic = collectible.getStatus() == ListingStatus.APPROVED;

        if (!(admin || isOwner || isPublic) || !collectible.hasPhoto()) {
            throw notFound();
        }

        return photoRepository.findById(id).orElseThrow(this::notFound);
    }

    public List<CollectibleResponse> findByStatus(ListingStatus status) {
        return repository.findByStatus(status)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public CollectibleResponse approve(UUID id) {
        Collectible collectible = findEntityById(id);
        collectible.applyModeration(ListingStatus.APPROVED, null);

        return toResponse(repository.save(collectible));
    }

    public CollectibleResponse reject(UUID id, String reason) {
        Collectible collectible = findEntityById(id);
        collectible.applyModeration(ListingStatus.REJECTED, reason);

        return toResponse(repository.save(collectible));
    }

    @Transactional
    public void deleteAsAdmin(UUID id) {
        Collectible collectible = findEntityById(id);
        photoRepository.deleteById(id);
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
                collectible.getModerationReason(),
                collectible.hasPhoto()
        );
    }
}
