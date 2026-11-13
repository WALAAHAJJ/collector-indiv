package com.collector.collection.config;

import com.collector.collection.domain.Category;
import com.collector.collection.domain.CategoryArt;
import com.collector.collection.repository.CategoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Crée les quatre catégories de départ quand la table est vide, pour que le site
 * soit utilisable dès le premier lancement. L'administrateur les gère ensuite.
 */
@Component
public class CategorySeeder implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(CategorySeeder.class);

    private final CategoryRepository repository;

    public CategorySeeder(CategoryRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (repository.count() > 0) {
            return;
        }

        repository.saveAll(List.of(
                new Category("Cartes postales", CategoryArt.POSTCARDS),
                new Category("Pièces", CategoryArt.COINS),
                new Category("Timbres", CategoryArt.STAMPS),
                new Category("Autres objets", CategoryArt.OTHER)
        ));

        LOGGER.info("Catégories par défaut créées.");
    }
}
