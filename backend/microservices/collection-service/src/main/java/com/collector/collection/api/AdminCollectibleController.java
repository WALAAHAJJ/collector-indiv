package com.collector.collection.api;

import com.collector.collection.api.dto.CollectibleResponse;
import com.collector.collection.api.dto.RejectRequest;
import com.collector.collection.domain.ListingStatus;
import com.collector.collection.service.CollectibleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Back-office : réservé aux comptes dont le jeton porte le rôle ADMIN (voir SecurityConfig). */
@RestController
@RequestMapping("/api/admin/collectibles")
public class AdminCollectibleController {

    private final CollectibleService service;

    public AdminCollectibleController(CollectibleService service) {
        this.service = service;
    }

    @GetMapping
    public List<CollectibleResponse> findByStatus(
            @RequestParam(defaultValue = "PENDING_REVIEW") ListingStatus status
    ) {
        return service.findByStatus(status);
    }

    @PostMapping("/{id}/approve")
    public CollectibleResponse approve(@PathVariable UUID id) {
        return service.approve(id);
    }

    @PostMapping("/{id}/reject")
    public CollectibleResponse reject(
            @PathVariable UUID id,
            @Valid @RequestBody RejectRequest request
    ) {
        return service.reject(id, request.reason());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.deleteAsAdmin(id);
    }
}
