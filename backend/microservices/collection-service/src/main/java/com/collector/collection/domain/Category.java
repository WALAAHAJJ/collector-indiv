package com.collector.collection.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Size(max = 60)
    @Column(nullable = false, unique = true, length = 60)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CategoryArt art;

    protected Category() {
    }

    public Category(String name, CategoryArt art) {
        this.name = name;
        this.art = art;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public CategoryArt getArt() {
        return art;
    }
}
