package com.collector.collection.api;

import com.collector.collection.api.dto.CollectibleResponse;
import com.collector.collection.domain.ListingStatus;
import com.collector.collection.service.CollectibleService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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
}
