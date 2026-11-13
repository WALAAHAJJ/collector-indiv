package com.collector.collection.config;

import java.util.List;

import com.collector.collection.domain.Category;
import com.collector.collection.repository.CategoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class CategorySeederTests {

    @Autowired
    private CategoryRepository repository;

    @Test
    void createsTheFourDefaultCategoriesAtStartup() {
        List<String> names = repository.findAllByOrderByNameAsc()
                .stream()
                .map(Category::getName)
                .toList();

        assertTrue(names.containsAll(
                List.of("Cartes postales", "Pièces", "Timbres", "Autres objets")), names.toString());
    }
}
