package com.collector.collection.api.dto;

import com.collector.collection.domain.CategoryArt;

import java.util.UUID;

public record CategoryResponse(UUID id, String name, CategoryArt art) {
}
