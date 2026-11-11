package com.collector.collection;

import com.collector.collection.domain.Collectible;
import com.collector.collection.repository.CollectibleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@Transactional
class CollectibleRepositoryTests {

    @Autowired
    private CollectibleRepository repository;

    @Test
    void savesAndFindsCollectiblesByOwner() {
        UUID ownerId = UUID.randomUUID();

        repository.save(new Collectible(
                ownerId,
                "Carte de collection",
                "Carte",
                "Première édition"
        ));

        List<Collectible> result = repository.findByOwnerId(ownerId);

        assertEquals(1, result.size());
        assertEquals("Carte de collection", result.get(0).getName());
        assertNotNull(result.get(0).getId());
    }
}
