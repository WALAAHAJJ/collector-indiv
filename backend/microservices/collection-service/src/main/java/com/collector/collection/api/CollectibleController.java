package com.collector.collection.api;

import com.collector.collection.api.dto.CollectibleResponse;
import com.collector.collection.api.dto.CreateCollectibleRequest;
import com.collector.collection.api.dto.UpdateCollectibleRequest;
import com.collector.collection.service.CollectibleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/collectibles")
public class CollectibleController {

    private final CollectibleService service;

    public CollectibleController(CollectibleService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CollectibleResponse create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateCollectibleRequest request
    ) {
        return service.create(currentUserId(jwt), request);
    }

    @GetMapping("/catalog")
    public List<CollectibleResponse> catalog(
            @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "") String search
    ) {
        return service.findCatalog(category, search);
    }

    @GetMapping
    public List<CollectibleResponse> findByOwnerId(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam UUID ownerId
    ) {
        UUID currentUserId = currentUserId(jwt);

        if (!currentUserId.equals(ownerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accès refusé");
        }

        return service.findByOwnerId(currentUserId);
    }

    @GetMapping("/{id}")
    public CollectibleResponse findById(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id
    ) {
        return service.findById(id, currentUserId(jwt));
    }

    @PutMapping("/{id}")
    public CollectibleResponse update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCollectibleRequest request
    ) {
        return service.update(id, currentUserId(jwt), request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id
    ) {
        service.delete(id, currentUserId(jwt));
    }

    private UUID currentUserId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Jeton invalide");
        }
    }
}
