package com.collector.collection.config;

import com.collector.collection.domain.Collectible;
import com.collector.collection.domain.ListingStatus;
import com.collector.collection.repository.CategoryRepository;
import com.collector.collection.repository.CollectibleRepository;
import com.collector.collection.service.ModerationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = "app.demo-data.enabled=true")
class DemoDataSeederTests {

    @Autowired
    private DemoDataSeeder seeder;

    @Autowired
    private CollectibleRepository collectibles;

    @Autowired
    private CategoryRepository categories;

    @Autowired
    private ModerationService moderation;

    private List<Collectible> demoListings() {
        return DemoCatalog.SELLERS.stream()
                .flatMap(seller -> collectibles.findByOwnerId(seller).stream())
                .toList();
    }

    @Test
    void loadsTheWholeCatalogAtStartup() {
        assertEquals(DemoCatalog.ITEMS.size(), demoListings().size());
        assertTrue(DemoCatalog.ITEMS.size() >= 40);
    }

    @Test
    void runningItAgainAddsNothing() {
        seeder.run(new DefaultApplicationArguments());
        seeder.run(new DefaultApplicationArguments());

        assertEquals(DemoCatalog.ITEMS.size(), demoListings().size());
    }

    @Test
    void everyListingUsesAnExistingCategory() {
        Set<String> names = new HashSet<>();
        categories.findAllByOrderByNameAsc().forEach(category -> names.add(category.getName()));

        for (DemoCatalog.Item item : DemoCatalog.ITEMS) {
            assertTrue(names.contains(item.category()), item.name() + " : " + item.category());
        }
        assertTrue(names.containsAll(List.of("Cartes postales", "Pièces", "Timbres", "Autres objets")));
        assertTrue(names.containsAll(DemoCatalog.EXTRA_CATEGORIES));
    }

    @Test
    void theDemoDataFollowsTheSiteRules() {
        Set<String> seen = new HashSet<>();

        for (DemoCatalog.Item item : DemoCatalog.ITEMS) {
            assertTrue(seen.add(item.name()), "nom en double : " + item.name());
            assertTrue(item.name().length() <= 120, item.name());
            assertTrue(item.description().length() <= 1000, item.name());
            assertTrue(item.priceValue().signum() > 0, item.name());
            assertTrue(item.shippingValue().signum() >= 0, item.name());
            assertTrue(item.seller() >= 0 && item.seller() < DemoCatalog.SELLERS.size(), item.name());
        }
    }

    @Test
    void ordinaryListingsAreApprovedAndTheExpensiveOneWaitsForTheAdmin() {
        List<Collectible> listings = demoListings();
        long pending = listings.stream().filter(l -> l.getStatus() == ListingStatus.PENDING_REVIEW).count();
        long approved = listings.stream().filter(l -> l.getStatus() == ListingStatus.APPROVED).count();

        assertEquals(1, pending);
        assertEquals(DemoCatalog.ITEMS.size() - 1, approved);

        for (Collectible listing : listings) {
            assertEquals(
                    moderation.evaluate(listing.getName(), listing.getDescription(), listing.getPrice()).status(),
                    listing.getStatus(),
                    listing.getName());
        }
    }

    @Test
    void demoSellersAreNotRealUsers() {
        assertTrue(DemoCatalog.SELLERS.stream().noneMatch(id -> id.equals(new UUID(0, 0))));
        assertEquals(DemoCatalog.SELLERS.size(), new HashSet<>(DemoCatalog.SELLERS).size());
    }
}
