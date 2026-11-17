package com.collector.collection.config;

import com.collector.collection.domain.Category;
import com.collector.collection.domain.CategoryArt;
import com.collector.collection.domain.Collectible;
import com.collector.collection.repository.CategoryRepository;
import com.collector.collection.repository.CollectibleRepository;
import com.collector.collection.service.ModerationResult;
import com.collector.collection.service.ModerationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Charge une quarantaine d'annonces de démonstration pour que le site paraisse vivant dès le premier
 * lancement. Désactivé par défaut : il faut mettre {@code app.demo-data.enabled=true}
 * (dans Docker : {@code DEMO_DATA=true} dans le fichier {@code .env}).
 *
 * <p>Chaque annonce passe par les mêmes règles de modération que celles des utilisateurs : l'annonce
 * à prix élevé reste donc « en attente » et apparaît dans la file de l'administrateur.
 * Le chargement n'a lieu qu'une fois : si le premier vendeur fictif a déjà des annonces, rien n'est ajouté.
 */
@Component
@Order(2)
@ConditionalOnProperty(name = "app.demo-data.enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final CollectibleRepository collectibles;
    private final CategoryRepository categories;
    private final ModerationService moderation;

    public DemoDataSeeder(
            CollectibleRepository collectibles,
            CategoryRepository categories,
            ModerationService moderation
    ) {
        this.collectibles = collectibles;
        this.categories = categories;
        this.moderation = moderation;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (collectibles.existsByOwnerId(DemoCatalog.SELLERS.get(0))) {
            return;
        }

        for (String name : DemoCatalog.EXTRA_CATEGORIES) {
            if (!categories.existsByNameIgnoreCase(name)) {
                categories.save(new Category(name, CategoryArt.OTHER));
            }
        }

        for (DemoCatalog.Item item : DemoCatalog.ITEMS) {
            Collectible listing = new Collectible(
                    item.sellerId(),
                    item.name(),
                    item.category(),
                    item.description(),
                    item.priceValue(),
                    item.shippingValue(),
                    item.condition()
            );
            ModerationResult result = moderation.evaluate(item.name(), item.description(), item.priceValue());
            listing.applyModeration(result.status(), result.reason());
            collectibles.save(listing);
        }

        LOGGER.info("{} annonces de démonstration créées.", DemoCatalog.ITEMS.size());
    }
}
