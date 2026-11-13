package com.collector.collection.api;

import com.collector.collection.api.dto.CategoryResponse;
import com.collector.collection.service.CategoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Liste publique des catégories : le catalogue et le formulaire de dépôt en ont besoin. */
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService service;

    public CategoryController(CategoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<CategoryResponse> findAll() {
        return service.findAll();
    }
}
