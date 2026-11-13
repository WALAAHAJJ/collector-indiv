package com.collector.collection.service;

import com.collector.collection.api.dto.CategoryResponse;
import com.collector.collection.api.dto.CreateCategoryRequest;
import com.collector.collection.domain.Category;
import com.collector.collection.repository.CategoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CategoryService {

    private final CategoryRepository categories;

    public CategoryService(CategoryRepository categories) {
        this.categories = categories;
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

    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(category.getId(), category.getName(), category.getArt());
    }
}
