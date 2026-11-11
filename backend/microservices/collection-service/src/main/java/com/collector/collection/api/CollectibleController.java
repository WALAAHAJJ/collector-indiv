package com.collector.collection.api;

import com.collector.collection.api.dto.CollectibleResponse;
import com.collector.collection.api.dto.CreateCollectibleRequest;
import com.collector.collection.api.dto.UpdateCollectibleRequest;
import com.collector.collection.service.CollectibleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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
    public CollectibleResponse create(@Valid @RequestBody CreateCollectibleRequest request) {
        return service.create(request);
    }

    @GetMapping("/catalog")
    public List<CollectibleResponse> catalog(
            @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "") String search
    ) {
        return service.findCatalog(category, search);
    }

    @GetMapping
    public List<CollectibleResponse> findByOwnerId(@RequestParam UUID ownerId) {
        return service.findByOwnerId(ownerId);
    }

    @GetMapping("/{id}")
    public CollectibleResponse findById(@PathVariable UUID id) {
        return service.findById(id);
    }

    @PutMapping("/{id}")
    public CollectibleResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateCollectibleRequest request
    ) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
