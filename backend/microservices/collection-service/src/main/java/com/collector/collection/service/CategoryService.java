package com.collector.collection.service;

import com.collector.collection.api.dto.CategoryResponse;
import com.collector.collection.api.dto.CreateCategoryRequest;
import com.collector.collection.domain.Category;
import com.collector.collection.repository.CategoryRepository;
import com.collector.collection.repository.CollectibleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categories;
    private final CollectibleRepository collectibles;

    public CategoryService(CategoryRepository categories, CollectibleRepository collectibles) {
        this.categories = categories;
        this.collectibles = collectibles;
    }

    public List<CategoryResponse> findAll() {
        return categories.findAllByOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public CategoryResponse create(CreateCategoryRequest request) {
        String name = request.name().trim();

        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le nom est obligatoire");
        }

        if (categories.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette catégorie existe déjà");
        }

        return toResponse(categories.save(new Category(name, request.art())));
    }

    public void delete(UUID id) {
        Category category = categories.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Catégorie introuvable"));

        long used = collectibles.countByCategoryIgnoreCase(category.getName());

        if (used > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cette catégorie est utilisée par " + used + " annonce(s)");
        }

        categories.delete(category);
    }

    /** Renvoie la catégorie portant ce nom, sans tenir compte de la casse, ou refuse la demande. */
    public Category requireByName(String name) {
        return categories.findByNameIgnoreCase(name.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Catégorie inconnue"));
    }

    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getArt());
    }
}
