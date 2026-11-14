package com.collector.collection.api;

import com.collector.collection.api.dto.CollectibleResponse;
import com.collector.collection.api.dto.CreateCollectibleRequest;
import com.collector.collection.api.dto.UpdateCollectibleRequest;
import com.collector.collection.domain.ListingPhoto;
import com.collector.collection.service.CollectibleService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Duration;
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

    @PostMapping(path = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CollectibleResponse uploadPhoto(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file
    ) throws IOException {
        return service.savePhoto(id, currentUserId(jwt), file.getBytes());
    }

    @DeleteMapping("/{id}/photo")
    public CollectibleResponse deletePhoto(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID id
    ) {
        return service.deletePhoto(id, currentUserId(jwt));
    }

    /** Route publique pour les annonces approuvées (balise img) ; sinon propriétaire ou administrateur. */
    @GetMapping("/{id}/photo")
    public ResponseEntity<byte[]> photo(
            @AuthenticationPrincipal Jwt jwt,
            Authentication authentication,
            @PathVariable UUID id
    ) {
        ListingPhoto photo = service.findPhoto(id, optionalUserId(jwt), isAdmin(authentication));

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photo.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(1)).cachePrivate())
                .body(photo.getData());
    }

    private UUID optionalUserId(Jwt jwt) {
        if (jwt == null) {
            return null;
        }

        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException exception) {
            return null;
        }
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }

    private UUID currentUserId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Jeton invalide");
        }
    }
}
